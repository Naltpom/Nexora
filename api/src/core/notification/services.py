"""Notification feature services: SSE broadcaster, notification processing."""

import asyncio
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

import redis.asyncio as aioredis
from sqlalchemy import asc, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..event.models import Event
from ..tasks import enqueue
from .models import Notification, NotificationRule, UserRulePreference

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
#  SSE Broadcasters
# ---------------------------------------------------------------------------


class InMemorySSEBroadcaster:
    """In-memory SSE broadcaster (fallback).

    Stores per-user asyncio queues. Suitable for single-process deployments
    where Redis is not available.
    """

    def __init__(self) -> None:
        self._connections: dict[int, list[asyncio.Queue]] = {}

    async def subscribe(self, user_id: int) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue()
        if user_id not in self._connections:
            self._connections[user_id] = []
        self._connections[user_id].append(queue)
        logger.debug(
            "SSE subscribe: user_id=%d (total=%d)",
            user_id,
            len(self._connections[user_id]),
        )
        return queue

    async def unsubscribe(self, user_id: int, queue: asyncio.Queue) -> None:
        if user_id in self._connections:
            try:
                self._connections[user_id].remove(queue)
            except ValueError:
                pass
            if not self._connections[user_id]:
                del self._connections[user_id]
        logger.debug("SSE unsubscribe: user_id=%d", user_id)

    async def push(self, user_id: int, data: dict[str, Any]) -> None:
        queues = self._connections.get(user_id, [])
        for queue in queues:
            try:
                queue.put_nowait(data)
            except asyncio.QueueFull:
                logger.warning(
                    "SSE queue full for user_id=%d, dropping notification",
                    user_id,
                )


class RedisSSEBroadcaster:
    """Redis pub/sub SSE broadcaster. Works across multiple API instances."""

    def __init__(self) -> None:
        self._redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        self._tasks: dict[int, list[tuple[asyncio.Queue, asyncio.Task]]] = {}

    async def subscribe(self, user_id: int) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue()
        task = asyncio.create_task(self._listen(user_id, queue))
        if user_id not in self._tasks:
            self._tasks[user_id] = []
        self._tasks[user_id].append((queue, task))
        logger.debug("SSE subscribe: user_id=%d", user_id)
        return queue

    async def _listen(self, user_id: int, queue: asyncio.Queue) -> None:
        channel = f"sse:{user_id}"
        pubsub = self._redis.pubsub()
        await pubsub.subscribe(channel)
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    try:
                        data = json.loads(message["data"])
                        queue.put_nowait(data)
                    except (json.JSONDecodeError, asyncio.QueueFull):
                        pass
        except asyncio.CancelledError:
            pass
        finally:
            await pubsub.unsubscribe(channel)
            await pubsub.aclose()

    async def unsubscribe(self, user_id: int, queue: asyncio.Queue) -> None:
        if user_id in self._tasks:
            # Find and cancel the task associated with this queue first
            task_to_cancel: asyncio.Task | None = None
            for q, t in self._tasks[user_id]:
                if q is queue:
                    task_to_cancel = t
                    break
            if task_to_cancel is not None:
                task_to_cancel.cancel()
            # Remove the entry from the list
            self._tasks[user_id] = [
                (q, t) for q, t in self._tasks[user_id] if q is not queue
            ]
            if not self._tasks[user_id]:
                del self._tasks[user_id]
        logger.debug("SSE unsubscribe: user_id=%d", user_id)

    async def push(self, user_id: int, data: dict[str, Any]) -> None:
        channel = f"sse:{user_id}"
        await self._redis.publish(channel, json.dumps(data, default=str))


# Singleton instance
sse_broadcaster = RedisSSEBroadcaster()


# ---------------------------------------------------------------------------
#  Notification content builder
# ---------------------------------------------------------------------------


def build_notification_content(event: Event) -> tuple[str, str | None, str | None]:
    """Build (title, body, link) from an Event."""
    payload = event.payload or {}
    actor = payload.get("actor_name", "Quelqu'un")

    if event.event_type == "user.registered":
        user_name = payload.get("user_name", actor)
        msg = f"{user_name} s'est inscrit"
    elif event.event_type == "user.invited":
        invited = payload.get("invited_email", "un utilisateur")
        msg = f"{actor} a invite {invited}"
    elif event.event_type == "user.invitation_accepted":
        member = payload.get("member_name", "Un utilisateur")
        msg = f"Invitation acceptee par {member}"
    elif event.event_type == "user.updated":
        msg = f"{actor} a mis a jour son profil"
    elif event.event_type == "user.deactivated":
        target = payload.get("target_name", "un utilisateur")
        msg = f"{actor} a desactive {target}"
    elif event.event_type == "admin.impersonation_started":
        target = payload.get("target_name", "un utilisateur")
        msg = f"{actor} impersonifie {target}"
    else:
        msg = event.event_type

    title = msg
    return title, None, None


def build_webhook_payload(
    webhook_format: str,
    event: Event,
    webhook_prefix: str | None = None,
) -> dict:
    """Build a webhook payload for an Event, respecting the webhook format."""
    title, body, link = build_notification_content(event)
    compact = title

    if webhook_format == "slack":
        text = f"*{compact}*"
        if webhook_prefix:
            text = f"{webhook_prefix}\n{text}"
        blocks = [{"type": "section", "text": {"type": "mrkdwn", "text": text}}]
        return {"blocks": blocks, "text": f"{webhook_prefix}\n{compact}" if webhook_prefix else compact}

    if webhook_format == "discord":
        embed = {"title": compact, "color": 6366961}
        result = {"embeds": [embed]}
        if webhook_prefix:
            result["content"] = webhook_prefix
        return result

    result = {
        "event_type": event.event_type,
        "event_id": event.id,
        "actor_id": event.actor_id,
        "resource_type": event.resource_type,
        "resource_id": event.resource_id,
        "payload": event.payload,
        "created_at": event.created_at.isoformat() if event.created_at else None,
    }
    if webhook_prefix:
        result["prefix"] = webhook_prefix
    return result


def resolve_channels(
    rule: NotificationRule,
    user_pref: UserRulePreference | None = None,
) -> dict[str, bool]:
    """Resolve which notification channels should be used for a rule/user combination."""
    if rule.is_default_template and user_pref:
        if not user_pref.is_active:
            return {"in_app": False, "email": False, "webhook": False, "push": False}
        if user_pref.is_customized:
            return {
                "in_app": user_pref.channel_in_app,
                "email": user_pref.channel_email,
                "webhook": user_pref.channel_webhook,
                "push": user_pref.channel_push,
            }
        return {
            "in_app": rule.default_in_app,
            "email": rule.default_email,
            "webhook": rule.default_webhook,
            "push": rule.default_push,
        }
    return {
        "in_app": rule.channel_in_app,
        "email": rule.channel_email,
        "webhook": rule.channel_webhook,
        "push": rule.channel_push,
    }


# ---------------------------------------------------------------------------
#  Notification processing (match rules, create notifications, trigger channels)
# ---------------------------------------------------------------------------


async def process_notifications(
    db: AsyncSession,
    event: Event,
) -> None:
    """Match rules against the event, create notifications, trigger delivery channels."""
    from .._identity.models import User
    from .webhook.models import Webhook

    # Get all active rules
    result = await db.execute(
        select(NotificationRule).where(NotificationRule.is_active.is_(True))
    )
    all_rules = result.scalars().all()

    # Find matching rules
    rules = [r for r in all_rules if r.matches_event(event.event_type)]
    if not rules:
        return

    # Pre-load user preferences for template rules
    template_rule_ids = [r.id for r in rules if r.is_default_template]
    user_prefs: dict[tuple[int, int], UserRulePreference] = {}
    if template_rule_ids:
        pref_result = await db.execute(
            select(UserRulePreference).where(
                UserRulePreference.rule_id.in_(template_rule_ids)
            )
        )
        for pref in pref_result.scalars().all():
            user_prefs[(pref.user_id, pref.rule_id)] = pref

    notified_users: set[int] = set()
    webhook_rule_ids: set[int] = set()
    explicit_webhook_ids: set[int] = set()

    for rule in rules:
        # Resolve recipients
        if rule.target_type == "all":
            user_result = await db.execute(
                select(User).where(User.is_active.is_(True))
            )
            recipient_ids = {u.id for u in user_result.scalars().all()}
        elif rule.target_type == "users":
            recipient_ids = set(rule.target_user_ids or [])
        elif rule.target_type == "self":
            recipient_ids = {rule.created_by_id}
        else:
            recipient_ids = set()

        # Exclude the actor
        recipient_ids.discard(event.actor_id)
        new_recipients = recipient_ids - notified_users
        if not new_recipients:
            continue

        title, body, link = build_notification_content(event)

        for user_id in new_recipients:
            pref = user_prefs.get((user_id, rule.id))
            channels = resolve_channels(rule, pref)

            if not any(channels.values()):
                continue

            if channels["in_app"]:
                notif = Notification(
                    user_id=user_id,
                    event_id=event.id,
                    rule_id=rule.id,
                    title=title,
                    body=body,
                    link=link,
                    email_sent_at=datetime.now(timezone.utc) if channels["email"] else None,
                    webhook_sent_at=datetime.now(timezone.utc) if channels["webhook"] else None,
                )
                db.add(notif)
                await db.flush()

                # Push SSE notification
                await sse_broadcaster.push(user_id, {
                    "type": "notification",
                    "data": {
                        "id": notif.id,
                        "title": title,
                        "body": body,
                        "link": link,
                        "is_read": False,
                        "event_type": event.event_type,
                        "created_at": notif.created_at.isoformat() if notif.created_at else None,
                    },
                })

            # Enqueue email delivery
            if channels["email"]:
                user_result = await db.execute(
                    select(User).where(User.id == user_id)
                )
                user = user_result.scalar_one_or_none()
                if user and user.email:
                    await enqueue(
                        "send_email_task",
                        user.email,
                        f"{user.first_name} {user.last_name}",
                        title,
                        body,
                        link,
                    )

            # Enqueue push delivery
            if channels["push"]:
                await enqueue("send_push_task", user_id, title, body, link)

            # Collect webhook data
            if channels["webhook"]:
                if rule.is_default_template and pref and pref.webhook_ids:
                    explicit_webhook_ids.update(pref.webhook_ids)
                elif rule.webhook_ids:
                    explicit_webhook_ids.update(rule.webhook_ids)
                else:
                    webhook_rule_ids.add(rule.id)

        notified_users.update(new_recipients)

    # Enqueue webhook deliveries
    if webhook_rule_ids or explicit_webhook_ids:
        from ..encryption import decrypt_value, is_encrypted

        def _decrypt_secret(secret: str | None) -> str | None:
            if secret and is_encrypted(secret):
                return decrypt_value(secret)
            return secret

        webhook_result = await db.execute(
            select(Webhook).where(Webhook.is_active.is_(True))
        )
        webhooks = webhook_result.scalars().all()
        sent_ids: set[int] = set()

        for webhook in webhooks:
            if webhook.id in sent_ids:
                continue

            if explicit_webhook_ids and webhook.id in explicit_webhook_ids:
                sent_ids.add(webhook.id)
                payload = build_webhook_payload(webhook.format, event, webhook.prefix)
                await enqueue(
                    "send_webhook_task",
                    webhook.url,
                    payload,
                    secret=_decrypt_secret(webhook.secret),
                    webhook_id=webhook.id,
                    event_id=event.id,
                )
                continue

            if webhook.notification_rule_ids:
                if not webhook_rule_ids or not set(webhook.notification_rule_ids).intersection(webhook_rule_ids):
                    continue
            elif webhook.event_types and event.event_type not in webhook.event_types:
                matched = False
                for pattern in webhook.event_types:
                    if pattern.endswith(".*") and event.event_type.startswith(pattern[:-2] + "."):
                        matched = True
                        break
                if not matched:
                    continue
            elif not webhook_rule_ids:
                continue

            sent_ids.add(webhook.id)
            payload = build_webhook_payload(webhook.format, event, webhook.prefix)
            await enqueue(
                "send_webhook_task",
                webhook.url,
                payload,
                secret=_decrypt_secret(webhook.secret),
            )


# ---------------------------------------------------------------------------
#  Notification queries
# ---------------------------------------------------------------------------


async def list_notifications(
    db: AsyncSession,
    *,
    user_id: int | None = None,
    unread_only: bool = False,
    include_deleted: bool = False,
    search: str = "",
    sort_by: str = "created_at",
    sort_dir: str = "desc",
    page: int = 1,
    per_page: int = 20,
    include_admin_fields: bool = False,
) -> tuple[list[dict], int]:
    """List notifications with pagination. Returns (rows, total)."""
    from .._identity.models import User

    query = select(Notification, Event, User).join(
        Event, Notification.event_id == Event.id
    ).join(
        User, Notification.user_id == User.id
    )

    if not include_deleted:
        query = query.where(Notification.deleted_at.is_(None))

    if user_id is not None:
        query = query.where(Notification.user_id == user_id)

    if unread_only:
        query = query.where(Notification.is_read.is_(False))

    if search:
        search_filter = or_(
            Notification.title.ilike(f"%{search}%"),
            Notification.body.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)

    # Count query
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Sorting
    sort_column = getattr(Notification, sort_by, Notification.created_at)
    order = desc(sort_column) if sort_dir == "desc" else asc(sort_column)
    query = query.order_by(order)

    # Pagination
    offset = (page - 1) * per_page
    query = query.offset(offset).limit(per_page)

    result = await db.execute(query)
    rows = []
    for notif, event, user in result.all():
        row = {
            "id": notif.id,
            "event_type": event.event_type,
            "title": notif.title,
            "body": notif.body,
            "link": notif.link,
            "is_read": notif.is_read,
            "email_sent_at": notif.email_sent_at,
            "webhook_sent_at": notif.webhook_sent_at,
            "push_sent_at": notif.push_sent_at,
            "deleted_at": notif.deleted_at,
            "created_at": notif.created_at,
        }
        if include_admin_fields:
            row["user_id"] = notif.user_id
            row["user_email"] = user.email
            row["user_name"] = f"{user.first_name} {user.last_name}"
        rows.append(row)

    return rows, total


async def get_unread_count(db: AsyncSession, user_id: int) -> int:
    """Get the count of unread notifications for a user."""
    result = await db.execute(
        select(func.count()).select_from(Notification).where(
            Notification.user_id == user_id,
            Notification.is_read.is_(False),
            Notification.deleted_at.is_(None),
        )
    )
    return result.scalar() or 0


async def mark_notification_read(db: AsyncSession, notification_id: int, user_id: int) -> bool:
    """Mark a single notification as read. Returns True if found and updated."""
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user_id,
        )
    )
    notif = result.scalar_one_or_none()
    if not notif:
        return False
    notif.is_read = True
    notif.read_at = datetime.now(timezone.utc)
    await db.flush()
    return True


async def mark_notification_unread(db: AsyncSession, notification_id: int, user_id: int) -> bool:
    """Mark a single notification as unread. Returns True if found and updated."""
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user_id,
        )
    )
    notif = result.scalar_one_or_none()
    if not notif:
        return False
    notif.is_read = False
    notif.read_at = None
    await db.flush()
    return True


async def mark_all_notifications_read(db: AsyncSession, user_id: int) -> None:
    """Mark all unread notifications as read for a user."""
    result = await db.execute(
        select(Notification).where(
            Notification.user_id == user_id,
            Notification.is_read.is_(False),
            Notification.deleted_at.is_(None),
        )
    )
    now = datetime.now(timezone.utc)
    for notif in result.scalars().all():
        notif.is_read = True
        notif.read_at = now
    await db.flush()


async def delete_notification(db: AsyncSession, notification_id: int, user_id: int) -> bool:
    """Soft-delete a notification. Returns True if found and deleted."""
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user_id,
            Notification.deleted_at.is_(None),
        )
    )
    notif = result.scalar_one_or_none()
    if not notif:
        return False
    notif.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    return True


async def purge_deleted_notifications(db: AsyncSession, days: int) -> int:
    """Hard-delete notifications that were soft-deleted more than `days` days ago.
    Returns the number of purged rows."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(Notification).where(
            Notification.deleted_at.isnot(None),
            Notification.deleted_at < cutoff,
        )
    )
    rows = result.scalars().all()
    count = len(rows)
    for notif in rows:
        await db.delete(notif)
    await db.flush()
    return count


# ---------------------------------------------------------------------------
#  Rule queries
# ---------------------------------------------------------------------------


async def list_all_rules(db: AsyncSession) -> list[dict]:
    """List global notification rules (exclude personal rules) with creator names."""
    from .._identity.models import User

    result = await db.execute(
        select(NotificationRule, User).join(
            User, NotificationRule.created_by_id == User.id
        ).where(
            NotificationRule.target_type != "self",
        ).order_by(NotificationRule.created_at.desc())
    )
    rules = []
    for rule, creator in result.all():
        rules.append(_rule_to_dict(rule, creator))
    return rules


async def list_my_rules(db: AsyncSession, user_id: int) -> list[dict]:
    """List rules visible to a user (their own + default templates) with preferences."""
    from .._identity.models import User

    result = await db.execute(
        select(NotificationRule, User).join(
            User, NotificationRule.created_by_id == User.id
        ).where(
            or_(
                NotificationRule.created_by_id == user_id,
                NotificationRule.is_default_template.is_(True),
            )
        ).order_by(NotificationRule.created_at.desc())
    )

    # Load user preferences
    pref_result = await db.execute(
        select(UserRulePreference).where(UserRulePreference.user_id == user_id)
    )
    prefs_by_rule = {p.rule_id: p for p in pref_result.scalars().all()}

    rules = []
    for rule, creator in result.all():
        pref = prefs_by_rule.get(rule.id)
        rules.append(_rule_to_dict(rule, creator, user_pref=pref))
    return rules


def _rule_to_dict(rule: NotificationRule, creator, user_pref: UserRulePreference | None = None) -> dict:
    """Convert a rule + optional creator + optional preference to a response dict."""
    created_by_name = f"{creator.first_name} {creator.last_name}" if creator else None

    pref_data = None
    if user_pref:
        pref_data = {
            "is_active": user_pref.is_active,
            "channel_in_app": user_pref.channel_in_app,
            "channel_email": user_pref.channel_email,
            "channel_webhook": user_pref.channel_webhook,
            "channel_push": user_pref.channel_push,
            "is_customized": user_pref.is_customized,
            "webhook_ids": user_pref.webhook_ids,
        }

    return {
        "id": rule.id,
        "name": rule.name,
        "created_by_id": rule.created_by_id,
        "created_by_name": created_by_name,
        "event_types": rule.event_types or [],
        "target_type": rule.target_type,
        "target_user_ids": rule.target_user_ids,
        "channel_in_app": rule.channel_in_app,
        "channel_email": rule.channel_email,
        "channel_webhook": rule.channel_webhook,
        "channel_push": rule.channel_push,
        "webhook_ids": rule.webhook_ids,
        "default_in_app": rule.default_in_app,
        "default_email": rule.default_email,
        "default_webhook": rule.default_webhook,
        "default_push": rule.default_push,
        "is_active": rule.is_active,
        "is_default_template": rule.is_default_template,
        "user_preference": pref_data,
        "created_at": rule.created_at,
    }
