"""Notification feature routes: notifications CRUD, rules, event types."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..event.models import Event
from ..events import event_bus
from ..pagination import PaginatedResponse, PaginationParams
from ..permissions import load_user_permissions, require_permission
from ..security import get_current_user
from .models import Notification, NotificationRule, UserRulePreference
from .schemas import (
    AdminNotificationResponse,
    NotificationResponse,
    NotificationRuleCreate,
    NotificationRuleResponse,
    NotificationRuleUpdate,
    UnreadCountResponse,
    UpdateRulePreferenceRequest,
    UserRulePreferenceResponse,
)
from .services import (
    delete_notification as svc_delete_notification,
)
from .services import (
    get_unread_count as svc_get_unread_count,
)
from .services import (
    list_all_rules as svc_list_all_rules,
)
from .services import (
    list_my_rules as svc_list_my_rules,
)
from .services import (
    list_notifications as svc_list_notifications,
)
from .services import (
    mark_all_notifications_read as svc_mark_all_notifications_read,
)
from .services import (
    mark_notification_read as svc_mark_notification_read,
)
from .services import (
    mark_notification_unread as svc_mark_notification_unread,
)

router = APIRouter()


# -- Helpers -------------------------------------------------------------------


def _format_user_name(user) -> str | None:
    if not user:
        return None
    return f"{user.first_name} {user.last_name}"


def _rule_dict_to_response(d: dict) -> NotificationRuleResponse:
    """Map a rule dict to a NotificationRuleResponse schema."""
    pref_response = None
    if d.get("user_preference"):
        p = d["user_preference"]
        pref_response = UserRulePreferenceResponse(
            is_active=p["is_active"],
            channel_in_app=p["channel_in_app"],
            channel_email=p["channel_email"],
            channel_webhook=p["channel_webhook"],
            channel_push=p["channel_push"],
            is_customized=p["is_customized"],
            webhook_ids=p.get("webhook_ids"),
        )
    return NotificationRuleResponse(
        id=d["id"],
        name=d["name"],
        created_by_id=d["created_by_id"],
        created_by_name=d.get("created_by_name"),
        event_types=d["event_types"],
        target_type=d["target_type"],
        target_user_ids=d.get("target_user_ids"),
        channel_in_app=d["channel_in_app"],
        channel_email=d["channel_email"],
        channel_webhook=d["channel_webhook"],
        channel_push=d["channel_push"],
        webhook_ids=d.get("webhook_ids"),
        default_in_app=d["default_in_app"],
        default_email=d["default_email"],
        default_webhook=d["default_webhook"],
        default_push=d["default_push"],
        is_active=d["is_active"],
        is_default_template=d["is_default_template"],
        user_preference=pref_response,
        created_at=d["created_at"],
    )


async def _build_rule_response_from_entity(
    rule: NotificationRule,
    db: AsyncSession,
    user_pref: UserRulePreference | None = None,
) -> NotificationRuleResponse:
    """Build a NotificationRuleResponse from a rule entity with resolved creator name."""
    from .._identity.models import User

    result = await db.execute(select(User).where(User.id == rule.created_by_id))
    creator = result.scalar_one_or_none()
    created_by_name = _format_user_name(creator)

    pref_response = None
    if user_pref:
        pref_response = UserRulePreferenceResponse(
            is_active=user_pref.is_active,
            channel_in_app=user_pref.channel_in_app,
            channel_email=user_pref.channel_email,
            channel_webhook=user_pref.channel_webhook,
            channel_push=user_pref.channel_push,
            is_customized=user_pref.is_customized,
            webhook_ids=user_pref.webhook_ids,
        )

    return NotificationRuleResponse(
        id=rule.id,
        name=rule.name,
        created_by_id=rule.created_by_id,
        created_by_name=created_by_name,
        event_types=rule.event_types or [],
        target_type=rule.target_type,
        target_user_ids=rule.target_user_ids,
        channel_in_app=rule.channel_in_app,
        channel_email=rule.channel_email,
        channel_webhook=rule.channel_webhook,
        channel_push=rule.channel_push,
        webhook_ids=rule.webhook_ids,
        default_in_app=rule.default_in_app,
        default_email=rule.default_email,
        default_webhook=rule.default_webhook,
        default_push=rule.default_push,
        is_active=rule.is_active,
        is_default_template=rule.is_default_template,
        user_preference=pref_response,
        created_at=rule.created_at,
    )


# -- Notifications In-App ------------------------------------------------------


@router.get(
    "/",
    response_model=PaginatedResponse[NotificationResponse],
    dependencies=[Depends(require_permission("notification.read"))],
)
async def list_notifications_endpoint(
    pagination: PaginationParams = Depends(PaginationParams(
        default_per_page=20,
        default_sort_by="created_at",
        default_sort_dir="desc",
    )),
    unread_only: bool = Query(False),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Liste paginee des notifications de l'utilisateur."""
    rows, total, pages = await svc_list_notifications(
        db,
        pagination,
        user_id=current_user.id,
        unread_only=unread_only,
    )

    items = [
        NotificationResponse(
            id=row["id"],
            event_type=row["event_type"],
            title=row["title"],
            body=row.get("body"),
            link=row.get("link"),
            is_read=row["is_read"],
            required_permission=row.get("required_permission"),
            email_sent_at=row.get("email_sent_at"),
            webhook_sent_at=row.get("webhook_sent_at"),
            push_sent_at=row.get("push_sent_at"),
            created_at=row["created_at"],
        )
        for row in rows
    ]

    return PaginatedResponse(
        items=items, total=total, page=pagination.page, per_page=pagination.per_page, pages=pages,
    )


@router.get(
    "/unread-count",
    response_model=UnreadCountResponse,
    dependencies=[Depends(require_permission("notification.read"))],
)
async def get_unread_count_endpoint(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    count = await svc_get_unread_count(db, current_user.id)
    return UnreadCountResponse(count=count)


@router.get(
    "/admin",
    response_model=PaginatedResponse[AdminNotificationResponse],
    dependencies=[Depends(require_permission("notification.admin"))],
)
async def list_all_notifications(
    pagination: PaginationParams = Depends(PaginationParams(
        default_per_page=25,
        default_sort_by="created_at",
        default_sort_dir="desc",
    )),
    my_only: bool = Query(True),
    include_deleted: bool = Query(False),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = current_user.id if my_only else None
    rows, total, pages = await svc_list_notifications(
        db,
        pagination,
        user_id=user_id,
        include_deleted=include_deleted,
        include_admin_fields=True,
    )

    items = [
        AdminNotificationResponse(
            id=row["id"],
            user_id=row["user_id"],
            user_email=row["user_email"],
            user_name=row["user_name"],
            event_type=row["event_type"],
            title=row["title"],
            body=row.get("body"),
            link=row.get("link"),
            is_read=row["is_read"],
            required_permission=row.get("required_permission"),
            email_sent_at=row.get("email_sent_at"),
            webhook_sent_at=row.get("webhook_sent_at"),
            push_sent_at=row.get("push_sent_at"),
            deleted_at=row.get("deleted_at"),
            created_at=row["created_at"],
        )
        for row in rows
    ]

    return PaginatedResponse(
        items=items, total=total, page=pagination.page, per_page=pagination.per_page, pages=pages,
    )


@router.patch(
    "/{notification_id}/read",
    dependencies=[Depends(require_permission("notification.read"))],
)
async def mark_as_read(
    notification_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    found = await svc_mark_notification_read(db, notification_id, current_user.id)
    if not found:
        raise HTTPException(status_code=404, detail="Notification introuvable")
    return {"ok": True}


@router.patch(
    "/{notification_id}/unread",
    dependencies=[Depends(require_permission("notification.read"))],
)
async def mark_as_unread(
    notification_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    found = await svc_mark_notification_unread(db, notification_id, current_user.id)
    if not found:
        raise HTTPException(status_code=404, detail="Notification introuvable")
    return {"ok": True}


@router.patch(
    "/read-all",
    dependencies=[Depends(require_permission("notification.read"))],
)
async def mark_all_as_read(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await svc_mark_all_notifications_read(db, current_user.id)
    return {"ok": True}


@router.delete(
    "/{notification_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("notification.delete"))],
)
async def delete_notification_endpoint(
    notification_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    found = await svc_delete_notification(db, notification_id, current_user.id)
    if not found:
        raise HTTPException(status_code=404, detail="Notification introuvable")


# -- Resend --------------------------------------------------------------------


@router.post(
    "/{notification_id}/resend-email",
    dependencies=[Depends(require_permission("notification.email.resend"))],
)
async def resend_email(
    notification_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from .._identity.models import User
    from .email.services import SmtpEmailSender

    result = await db.execute(
        select(Notification).where(Notification.id == notification_id)
    )
    notif = result.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification introuvable")
    if not notif.email_sent_at:
        raise HTTPException(status_code=400, detail="Cette notification n'a pas ete envoyee par email")

    result = await db.execute(select(User).where(User.id == notif.user_id))
    user = result.scalar_one_or_none()
    if not user or not user.email:
        raise HTTPException(status_code=400, detail="Utilisateur introuvable ou sans email")

    email_sender = SmtpEmailSender()
    success = email_sender.send_notification(
        to_email=user.email,
        to_name=f"{user.first_name} {user.last_name}",
        title=notif.title,
        body=notif.body or "",
        link=notif.link,
    )
    if not success:
        raise HTTPException(status_code=500, detail="Echec de l'envoi de l'email")

    notif.email_sent_at = datetime.now(timezone.utc)
    await db.flush()
    return {"ok": True, "message": f"Email renvoye a {user.email}"}


@router.post(
    "/{notification_id}/resend-push",
    dependencies=[Depends(require_permission("notification.push.resend"))],
)
async def resend_push(
    notification_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from .push.services import WebPushSender

    result = await db.execute(
        select(Notification).where(Notification.id == notification_id)
    )
    notif = result.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification introuvable")
    if not notif.push_sent_at:
        raise HTTPException(status_code=400, detail="Cette notification n'a pas ete envoyee via push")

    push_sender = WebPushSender()
    await push_sender.send(
        user_id=notif.user_id,
        title=notif.title,
        body=notif.body,
        link=notif.link,
        db=db,
    )

    notif.push_sent_at = datetime.now(timezone.utc)
    await db.flush()

    await event_bus.emit(
        "notification.push.resent",
        db=db,
        actor_id=current_user.id,
        resource_type="notification",
        resource_id=notif.id,
        payload={
            "actor_name": f"{current_user.first_name} {current_user.last_name}",
            "target_user_id": notif.user_id,
        },
    )

    return {"ok": True, "message": "Push renvoye"}


@router.post(
    "/{notification_id}/resend-webhook",
    dependencies=[Depends(require_permission("notification.admin"))],
)
async def resend_webhook_endpoint(
    notification_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from .webhook.models import Webhook
    from .webhook.services import HttpWebhookSender

    result = await db.execute(
        select(Notification).where(Notification.id == notification_id)
    )
    notif = result.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification introuvable")
    if not notif.webhook_sent_at:
        raise HTTPException(status_code=400, detail="Cette notification n'a pas ete envoyee via webhook")

    result = await db.execute(select(Event).where(Event.id == notif.event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=400, detail="Event associe introuvable")

    result = await db.execute(
        select(Webhook).where(Webhook.is_active.is_(True))
    )
    webhooks = result.scalars().all()
    relevant_webhooks = [
        w for w in webhooks
        if w.user_id == notif.user_id or w.is_global
    ]
    if not relevant_webhooks:
        raise HTTPException(status_code=400, detail="Aucun webhook actif trouve")

    webhook_sender = HttpWebhookSender()
    sent_count = 0
    for webhook in relevant_webhooks:
        try:
            payload = {
                "event_type": event.event_type,
                "event_id": event.id,
                "actor_id": event.actor_id,
                "resource_type": event.resource_type,
                "resource_id": event.resource_id,
                "payload": event.payload,
                "created_at": event.created_at.isoformat() if event.created_at else None,
            }
            await webhook_sender.send(webhook.url, payload, secret=webhook.secret)
            sent_count += 1
        except Exception:
            pass

    notif.webhook_sent_at = datetime.now(timezone.utc)
    await db.flush()
    return {"ok": True, "message": f"Webhook renvoye a {sent_count} endpoint(s)"}


# -- Rules: Super Admin --------------------------------------------------------


@router.get(
    "/rules",
    response_model=list[NotificationRuleResponse],
    dependencies=[Depends(require_permission("notification.rules.read"))],
)
async def list_all_rules_endpoint(
    db: AsyncSession = Depends(get_db),
):
    dicts = await svc_list_all_rules(db)
    return [_rule_dict_to_response(d) for d in dicts]


@router.post(
    "/rules",
    response_model=NotificationRuleResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("notification.rules.create"))],
)
async def create_rule(
    data: NotificationRuleCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rule = NotificationRule(
        created_by_id=current_user.id,
        name=data.name,
        event_types=data.event_types,
        target_type=data.target_type,
        target_user_ids=data.target_user_ids,
        channel_in_app=data.channel_in_app,
        channel_email=data.channel_email,
        channel_webhook=data.channel_webhook,
        channel_push=data.channel_push,
        default_in_app=data.default_in_app,
        default_email=data.default_email,
        default_webhook=data.default_webhook,
        default_push=data.default_push,
        is_default_template=data.is_default_template,
    )
    db.add(rule)
    await db.flush()

    await event_bus.emit(
        "notification.rule_created",
        db=db,
        actor_id=current_user.id,
        resource_type="notification_rule",
        resource_id=rule.id,
        payload={
            "actor_name": f"{current_user.first_name} {current_user.last_name}",
            "rule_name": rule.name,
            "target_type": rule.target_type,
        },
    )

    return await _build_rule_response_from_entity(rule, db)


@router.put(
    "/rules/{rule_id}",
    response_model=NotificationRuleResponse,
    dependencies=[Depends(require_permission("notification.rules.update"))],
)
async def update_rule(
    rule_id: int,
    data: NotificationRuleUpdate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(NotificationRule).where(NotificationRule.id == rule_id)
    )
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Regle introuvable")
    user_perms = await load_user_permissions(db, current_user.id)
    if user_perms.get("notification.admin") is not True and rule.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Acces refuse")

    provided = data.model_dump(exclude_unset=True)
    for field, value in provided.items():
        setattr(rule, field, value)
    await db.flush()
    return await _build_rule_response_from_entity(rule, db)


@router.delete(
    "/rules/{rule_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("notification.rules.delete"))],
)
async def delete_rule(
    rule_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(NotificationRule).where(NotificationRule.id == rule_id)
    )
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Regle introuvable")
    user_perms = await load_user_permissions(db, current_user.id)
    if user_perms.get("notification.admin") is not True and rule.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Acces refuse")
    await db.delete(rule)
    await db.flush()


@router.patch(
    "/rules/{rule_id}/toggle",
    dependencies=[Depends(require_permission("notification.rules.update"))],
)
async def toggle_rule(
    rule_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(NotificationRule).where(NotificationRule.id == rule_id)
    )
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Regle introuvable")
    user_perms = await load_user_permissions(db, current_user.id)
    if user_perms.get("notification.admin") is not True and rule.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Acces refuse")
    rule.is_active = not rule.is_active
    await db.flush()
    return {"ok": True, "is_active": rule.is_active}


# -- Rules: Personal (User) ---------------------------------------------------


@router.get(
    "/rules/my",
    response_model=list[NotificationRuleResponse],
    dependencies=[Depends(require_permission("notification.rules.read"))],
)
async def list_my_rules_endpoint(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    dicts = await svc_list_my_rules(db, current_user.id)
    return [_rule_dict_to_response(d) for d in dicts]


@router.post(
    "/rules/my",
    response_model=NotificationRuleResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("notification.rules.create"))],
)
async def create_my_rule(
    data: NotificationRuleCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rule = NotificationRule(
        created_by_id=current_user.id,
        name=data.name,
        event_types=data.event_types,
        target_type="self",
        channel_in_app=data.channel_in_app,
        channel_email=data.channel_email,
        channel_webhook=data.channel_webhook,
        channel_push=data.channel_push,
        webhook_ids=data.webhook_ids,
    )
    db.add(rule)
    await db.flush()

    await event_bus.emit(
        "notification.rule_created",
        db=db,
        actor_id=current_user.id,
        resource_type="notification_rule",
        resource_id=rule.id,
        payload={
            "actor_name": f"{current_user.first_name} {current_user.last_name}",
            "rule_name": rule.name,
            "target_type": "self",
        },
    )

    return await _build_rule_response_from_entity(rule, db)


# -- User Preferences for Template Rules --------------------------------------


@router.put(
    "/rules/{rule_id}/preferences",
    response_model=UserRulePreferenceResponse,
    dependencies=[Depends(require_permission("notification.rules.read"))],
)
async def update_rule_preference(
    rule_id: int,
    data: UpdateRulePreferenceRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(NotificationRule).where(NotificationRule.id == rule_id)
    )
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Regle introuvable")
    if not rule.is_default_template:
        raise HTTPException(status_code=400, detail="Cet endpoint est reserve aux regles template")

    result = await db.execute(
        select(UserRulePreference).where(
            UserRulePreference.user_id == current_user.id,
            UserRulePreference.rule_id == rule_id,
        )
    )
    pref = result.scalar_one_or_none()

    if not pref:
        pref = UserRulePreference(
            user_id=current_user.id,
            rule_id=rule_id,
            is_active=True,
            channel_in_app=rule.default_in_app,
            channel_email=rule.default_email,
            channel_webhook=rule.default_webhook,
            channel_push=rule.default_push,
        )
        db.add(pref)

    provided = data.model_fields_set

    if "is_active" in provided:
        pref.is_active = data.is_active
    if "channel_in_app" in provided:
        pref.channel_in_app = data.channel_in_app
    if "channel_email" in provided:
        pref.channel_email = data.channel_email
    if "channel_webhook" in provided:
        pref.channel_webhook = data.channel_webhook
    if "channel_push" in provided:
        pref.channel_push = data.channel_push
    if "webhook_ids" in provided:
        pref.webhook_ids = data.webhook_ids
        pref.channel_webhook = bool(data.webhook_ids)

    channel_fields = {"channel_in_app", "channel_email", "channel_webhook", "channel_push", "webhook_ids"}
    if provided & channel_fields:
        pref.is_customized = True

    await db.flush()

    return UserRulePreferenceResponse(
        is_active=pref.is_active,
        channel_in_app=pref.channel_in_app,
        channel_email=pref.channel_email,
        channel_webhook=pref.channel_webhook,
        channel_push=pref.channel_push,
        is_customized=pref.is_customized,
        webhook_ids=pref.webhook_ids,
    )
