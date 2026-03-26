"""Notification feature services: notification processing, queries.

Features can register their own notification content builders via the
content_builder_registry. See register_content_builder() below.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING, Any, Callable

from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

if TYPE_CHECKING:
    from ..pagination import PaginationParams

from ..event.models import Event
from ..realtime.services import sse_broadcaster
from ..tasks import enqueue
from .models import Notification, NotificationRule, UserRulePreference

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
#  Content builder registry (plugin mechanism for features)
# ---------------------------------------------------------------------------

# Type: callable(event) -> (title, body, link) or None
ContentBuilderFn = Callable[..., tuple[str, str | None, str | None] | None]

# Registry: maps event_type prefix -> builder function
# Features register with register_content_builder("my_feature.*", my_builder)
_content_builders: list[tuple[str, ContentBuilderFn]] = []


def register_content_builder(event_pattern: str, builder: ContentBuilderFn) -> None:
    """Register a content builder for a set of event types.

    event_pattern can be:
    - An exact event type: "my_feature.item_created"
    - A wildcard prefix: "my_feature.*" (matches all my_feature.* events)
    - A category prefix: "my_feature." (matches my_feature.*)

    Features should call this at import time or during setup to register
    their notification content builders.
    """
    _content_builders.append((event_pattern, builder))


def _find_content_builder(event_type: str) -> ContentBuilderFn | None:
    """Find the most specific content builder for an event type."""
    # Try exact match first
    for pattern, builder in _content_builders:
        if pattern == event_type:
            return builder

    # Try prefix match (pattern ending with ".*" or just a prefix)
    for pattern, builder in _content_builders:
        if pattern.endswith(".*"):
            prefix = pattern[:-2]
            if event_type.startswith(prefix + "."):
                return builder
        elif pattern.endswith("."):
            if event_type.startswith(pattern):
                return builder

    return None


# ---------------------------------------------------------------------------
#  Notification content builder
# ---------------------------------------------------------------------------


def build_notification_content(event) -> tuple[str, str | None, str | None]:
    """Build (title, body, link) from an Event or pseudo-event SimpleNamespace.

    Core event types are handled here. Feature-specific event types are
    delegated to registered content builders.
    """
    payload = event.payload or {}
    actor = payload.get("actor_name", "Quelqu'un")

    # ── Core identity events ──
    if event.event_type == "user.registered":
        user_name = payload.get("user_name", actor)
        return f"{user_name} s'est inscrit", None, None

    if event.event_type == "user.invited":
        title = "Vous avez ete invite sur l'application"
        body = f"Par {actor}" if actor != "Quelqu'un" else None
        return title, body, None

    if event.event_type == "user.invitation_accepted":
        member = payload.get("member_name", "Un utilisateur")
        return f"Invitation acceptee par {member}", None, None

    if event.event_type == "user.updated":
        return f"{actor} a mis a jour son profil", None, None

    if event.event_type == "user.deactivated":
        target = payload.get("target_name", "un utilisateur")
        return f"{actor} a desactive {target}", None, None

    # ── Core admin events ──
    if event.event_type == "admin.impersonation_started":
        target = payload.get("target_name", "un utilisateur")
        return f"{actor} impersonifie {target}", None, None

    # ── Core lifecycle events ──
    if event.event_type == "exports.ready":
        export_label = payload.get("export_label", "Export")
        fmt = payload.get("format", "")
        count = payload.get("count", 0)
        entry_uuid = payload.get("entry_uuid", "")
        title = f"Export termine : {export_label}"
        body = f"{count} element(s), format {fmt.upper()}" if count else f"Format {fmt.upper()}"
        link = f"/exports?e={entry_uuid}" if entry_uuid else "/exports"
        return title, body, link

    # ── Feature-registered content builders (plugin mechanism) ──
    builder = _find_content_builder(event.event_type)
    if builder:
        result = builder(event)
        if result is not None:
            return result

    # ── Fallback: use event_type as title ──
    return event.event_type, None, None


def build_webhook_payload(
    webhook_format: str,
    event,
    webhook_prefix: str | None = None,
) -> dict:
    """Build a webhook payload for an Event or pseudo-event, respecting the webhook format."""
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

    created_at = getattr(event, "created_at", None)
    result = {
        "event_type": event.event_type,
        "event_id": event.id,
        "actor_id": event.actor_id,
        "resource_type": getattr(event, "resource_type", None),
        "resource_id": getattr(event, "resource_id", None),
        "payload": event.payload,
        "created_at": created_at.isoformat() if created_at else None,
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
    event,
) -> None:
    """Match rules against the event, create targeted notifications.

    Supports ``target_type`` values:
    - ``"event_target"``: reads ``target_user_id`` from event payload (1 recipient)
    - ``"users"``: uses ``rule.target_user_ids`` list
    - ``"self"``: the rule creator
    - ``"all"``: all active users (legacy, avoided for performance)
    """
    from .._identity.models import User

    # Get matching rules
    result = await db.execute(
        select(NotificationRule).where(NotificationRule.is_active.is_(True))
    )
    all_rules = result.scalars().all()
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
    pending_inserts: list[dict] = []
    pending_deliveries: list[dict] = []

    for rule in rules:
        # Resolve recipients based on target_type
        if rule.target_type == "event_target":
            target_id = (event.payload or {}).get("target_user_id")
            if not target_id:
                continue
            recipient_ids = {target_id}
        elif rule.target_type == "users":
            recipient_ids = set(rule.target_user_ids or [])
        elif rule.target_type == "self":
            recipient_ids = {rule.created_by_id}
        elif rule.target_type == "all":
            user_result = await db.execute(
                select(User.id).where(User.is_active.is_(True))
            )
            recipient_ids = {row[0] for row in user_result.all()}
        else:
            continue

        # Don't notify actors about their own actions, except for
        # event_target rules where the actor IS the intended recipient
        # (e.g., "your export is ready").
        if rule.target_type != "event_target":
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

            now = datetime.now(timezone.utc)

            if channels["in_app"]:
                pending_inserts.append({
                    "user_id": user_id,
                    "event_id": event.id,
                    "rule_id": rule.id,
                    "title": title,
                    "body": body,
                    "link": link,
                    "is_read": False,
                    "email_sent_at": now if channels["email"] else None,
                    "webhook_sent_at": now if channels["webhook"] else None,
                    "push_sent_at": now if channels["push"] else None,
                    "created_at": now,
                })

            pending_deliveries.append({
                "user_id": user_id,
                "channels": channels,
                "title": title,
                "body": body,
                "link": link,
            })

            if channels["webhook"]:
                if rule.is_default_template and pref and pref.webhook_ids:
                    explicit_webhook_ids.update(pref.webhook_ids)
                elif rule.webhook_ids:
                    explicit_webhook_ids.update(rule.webhook_ids)
                else:
                    webhook_rule_ids.add(rule.id)

        notified_users.update(new_recipients)

    # --- Insert notifications ---
    if pending_inserts:
        from sqlalchemy import insert as sa_insert

        stmt = sa_insert(Notification).values(pending_inserts).returning(
            Notification.id, Notification.user_id, Notification.title,
            Notification.body, Notification.link, Notification.created_at,
        )
        insert_result = await db.execute(stmt)

        for row in insert_result.all():
            notif_id, uid, n_title, n_body, n_link, n_created = row
            await sse_broadcaster.push(uid, event_type="notification", data={
                "id": notif_id,
                "title": n_title,
                "body": n_body,
                "link": n_link,
                "is_read": False,
                "event_type": event.event_type,
                "created_at": n_created.isoformat() if n_created else None,
            })

        await db.flush()

    # --- Enqueue email and push deliveries ---
    email_user_ids = [d["user_id"] for d in pending_deliveries if d["channels"]["email"]]
    users_by_id: dict[int, Any] = {}
    if email_user_ids:
        user_result = await db.execute(
            select(User).where(User.id.in_(email_user_ids))
        )
        users_by_id = {u.id: u for u in user_result.scalars().all()}

    for delivery in pending_deliveries:
        uid = delivery["user_id"]
        channels = delivery["channels"]

        if channels["email"]:
            user = users_by_id.get(uid)
            if user and user.email:
                await enqueue(
                    "send_email_task",
                    user.email,
                    f"{user.first_name} {user.last_name}",
                    delivery["title"],
                    delivery["body"],
                    delivery["link"],
                )

        if channels["push"]:
            await enqueue("send_push_task", uid, delivery["title"], delivery["body"], delivery["link"])

    # --- Enqueue webhook deliveries ---
    if webhook_rule_ids or explicit_webhook_ids:
        from ..encryption import decrypt_value, is_encrypted
        from .webhook.models import Webhook

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
                webhook_id=webhook.id,
                event_id=event.id,
            )


# ---------------------------------------------------------------------------
#  Notification queries
# ---------------------------------------------------------------------------


async def list_notifications(
    db: AsyncSession,
    pagination: PaginationParams,
    *,
    user_id: int | None = None,
    unread_only: bool = False,
    include_deleted: bool = False,
    include_admin_fields: bool = False,
) -> tuple[list[dict], int, int]:
    """List notifications with pagination. Returns (rows, total, pages)."""
    from .._identity.models import User
    from ..pagination import paginate, search_like_pattern

    query = select(Notification, Event, User).join(
        Event, Notification.event_id == Event.id
    ).outerjoin(
        User, Notification.user_id == User.id
    )

    if not include_deleted:
        query = query.where(Notification.deleted_at.is_(None))

    if user_id is not None:
        query = query.where(Notification.user_id == user_id)

    if unread_only:
        query = query.where(Notification.is_read.is_(False))

    if pagination.search:
        like = search_like_pattern(pagination.search)
        search_filter = or_(
            Notification.title.ilike(like),
            Notification.body.ilike(like),
        )
        query = query.where(search_filter)

    sort_whitelist = {
        "created_at": Notification.created_at,
        "title": Notification.title,
        "is_read": Notification.is_read,
    }
    result, total, pages = await paginate(
        db, query, pagination,
        sort_whitelist=sort_whitelist,
        default_sort_column=Notification.created_at,
    )

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
            row["user_email"] = user.email if user else None
            row["user_name"] = f"{user.first_name} {user.last_name}" if user else None
        rows.append(row)

    return rows, total, pages


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
    now = datetime.now(timezone.utc)
    await db.execute(
        update(Notification)
        .where(
            Notification.user_id == user_id,
            Notification.is_read.is_(False),
            Notification.deleted_at.is_(None),
        )
        .values(is_read=True, read_at=now)
    )
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
    """Hard-delete notifications that were soft-deleted more than ``days`` days ago.

    Uses batch_delete to process in manageable chunks.
    """
    from ..batch_utils import batch_delete
    from ..database import async_session

    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    return await batch_delete(
        async_session,
        Notification,
        (Notification.deleted_at.isnot(None), Notification.deleted_at < cutoff),
    )


async def purge_old_notifications(db: AsyncSession, days: int) -> int:
    """Hard-delete ALL notifications older than ``days`` days, regardless of soft-delete status.

    Uses batch_delete to process in manageable chunks.
    """
    from ..batch_utils import batch_delete
    from ..database import async_session

    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    return await batch_delete(
        async_session,
        Notification,
        (Notification.created_at < cutoff,),
    )


# ---------------------------------------------------------------------------
#  Rule queries
# ---------------------------------------------------------------------------


async def list_all_rules(db: AsyncSession) -> list[dict]:
    """List global notification rules (exclude personal rules) with creator names."""
    from .._identity.models import User

    result = await db.execute(
        select(NotificationRule, User).outerjoin(
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
        select(NotificationRule, User).outerjoin(
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
