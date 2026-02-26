"""Webhook CRUD routes: user webhooks and global (admin) webhooks."""


from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...database import get_db
from ...events import event_bus
from ...permissions import load_user_permissions, require_permission
from ...security import get_current_user
from .models import Webhook
from .schemas import WebhookCreate, WebhookResponse, WebhookUpdate
from .services import HttpWebhookSender

router = APIRouter()


# -- Helpers -------------------------------------------------------------------


def _webhook_to_response(w: Webhook) -> WebhookResponse:
    return WebhookResponse(
        id=w.id,
        name=w.name,
        url=w.url,
        format=w.format,
        prefix=w.prefix,
        is_active=w.is_active,
        is_global=w.is_global,
        event_types=w.event_types,
        notification_rule_ids=w.notification_rule_ids,
        created_at=w.created_at,
    )


# -- User Webhooks -------------------------------------------------------------


@router.get(
    "/",
    response_model=list[WebhookResponse],
    dependencies=[Depends(require_permission("notification.webhook.read"))],
)
async def list_my_webhooks(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Liste mes webhooks personnels."""
    result = await db.execute(
        select(Webhook).where(
            Webhook.user_id == current_user.id,
            Webhook.is_global.is_(False),
        ).order_by(Webhook.created_at.desc())
    )
    webhooks = result.scalars().all()
    return [_webhook_to_response(w) for w in webhooks]


@router.post(
    "/",
    response_model=WebhookResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("notification.webhook.create"))],
)
async def create_webhook(
    data: WebhookCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Creer un webhook personnel."""
    from ...encryption import encrypt_value
    webhook = Webhook(
        user_id=current_user.id,
        is_global=False,
        name=data.name,
        url=data.url,
        secret=encrypt_value(data.secret) if data.secret else None,
        format=data.format,
        prefix=data.prefix,
        event_types=data.event_types,
        notification_rule_ids=data.notification_rule_ids,
    )
    db.add(webhook)
    await db.flush()

    await event_bus.emit(
        "notification.webhook.created",
        db=db,
        actor_id=current_user.id,
        resource_type="webhook",
        resource_id=webhook.id,
        payload={
            "actor_name": f"{current_user.first_name} {current_user.last_name}",
            "webhook_name": webhook.name,
            "webhook_url": webhook.url,
            "is_global": False,
        },
    )

    return _webhook_to_response(webhook)


@router.put(
    "/{webhook_id}",
    response_model=WebhookResponse,
    dependencies=[Depends(require_permission("notification.webhook.update"))],
)
async def update_webhook(
    webhook_id: int,
    data: WebhookUpdate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Modifier un webhook."""
    result = await db.execute(select(Webhook).where(Webhook.id == webhook_id))
    webhook = result.scalar_one_or_none()
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook introuvable")
    user_perms = await load_user_permissions(db, current_user.id)
    if user_perms.get("notification.webhook.global.update") is not True and webhook.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Acces refuse")

    provided = data.model_dump(exclude_unset=True)
    if "secret" in provided and provided["secret"]:
        from ...encryption import encrypt_value
        provided["secret"] = encrypt_value(provided["secret"])
    for field, value in provided.items():
        setattr(webhook, field, value)
    await db.flush()

    await event_bus.emit(
        "notification.webhook.updated",
        db=db,
        actor_id=current_user.id,
        resource_type="webhook",
        resource_id=webhook.id,
        payload={
            "actor_name": f"{current_user.first_name} {current_user.last_name}",
            "webhook_name": webhook.name,
            "is_global": webhook.is_global,
            "fields_updated": list(provided.keys()),
        },
    )

    return _webhook_to_response(webhook)


@router.delete(
    "/{webhook_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("notification.webhook.delete"))],
)
async def delete_webhook(
    webhook_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Supprimer un webhook."""
    result = await db.execute(select(Webhook).where(Webhook.id == webhook_id))
    webhook = result.scalar_one_or_none()
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook introuvable")
    user_perms = await load_user_permissions(db, current_user.id)
    if user_perms.get("notification.webhook.global.delete") is not True and webhook.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Acces refuse")
    webhook_info = {"id": webhook.id, "name": webhook.name, "url": webhook.url, "is_global": webhook.is_global}
    await db.delete(webhook)
    await db.flush()

    await event_bus.emit(
        "notification.webhook.deleted",
        db=db,
        actor_id=current_user.id,
        resource_type="webhook",
        resource_id=webhook_info["id"],
        payload={
            "actor_name": f"{current_user.first_name} {current_user.last_name}",
            "webhook_name": webhook_info["name"],
            "webhook_url": webhook_info["url"],
            "is_global": webhook_info["is_global"],
        },
    )


@router.post(
    "/{webhook_id}/test",
    dependencies=[Depends(require_permission("notification.webhook.test"))],
)
async def test_webhook(
    webhook_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Envoyer un event de test a un webhook."""
    result = await db.execute(select(Webhook).where(Webhook.id == webhook_id))
    webhook = result.scalar_one_or_none()
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook introuvable")
    user_perms = await load_user_permissions(db, current_user.id)
    if user_perms.get("notification.webhook.global.read") is not True and webhook.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Acces refuse")

    actor_name = f"{current_user.first_name} {current_user.last_name}"

    # Build test payload based on webhook format
    if webhook.format == "slack":
        text = f"*Test webhook from {actor_name}*"
        if webhook.prefix:
            text = f"{webhook.prefix}\n{text}"
        payload = {
            "blocks": [{"type": "section", "text": {"type": "mrkdwn", "text": text}}],
            "text": text,
        }
    elif webhook.format == "discord":
        embed = {"title": f"Test webhook from {actor_name}", "color": 6366961}
        payload = {"embeds": [embed]}
        if webhook.prefix:
            payload["content"] = webhook.prefix
    else:
        payload = {
            "event_type": "webhook.test",
            "actor_name": actor_name,
            "message": f"Test webhook triggered by {actor_name}",
            "webhook_id": webhook.id,
            "webhook_name": webhook.name,
        }
        if webhook.prefix:
            payload["prefix"] = webhook.prefix

    from ...encryption import decrypt_value, is_encrypted
    webhook_secret = decrypt_value(webhook.secret) if webhook.secret and is_encrypted(webhook.secret) else webhook.secret

    sender = HttpWebhookSender()
    try:
        result = await sender.send(webhook.url, payload, secret=webhook_secret, webhook_id=webhook.id, db=db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Echec de l'envoi: {str(e)}")

    await event_bus.emit(
        "notification.webhook.tested",
        db=db,
        actor_id=current_user.id,
        resource_type="webhook",
        resource_id=webhook.id,
        payload={
            "actor_name": actor_name,
            "webhook_name": webhook.name,
            "webhook_url": webhook.url,
            "success": result.get("success", False),
        },
    )

    if result.get("success"):
        return {"ok": True, "message": f"Test envoye a {webhook.url}"}
    raise HTTPException(status_code=502, detail=f"Webhook a repondu avec erreur: {result.get('status_code', 'N/A')}")


# -- Global Webhooks (Super Admin) --------------------------------------------


@router.get(
    "/global",
    response_model=list[WebhookResponse],
    dependencies=[Depends(require_permission("notification.webhook.global.read"))],
)
async def list_global_webhooks(
    db: AsyncSession = Depends(get_db),
):
    """Liste les webhooks globaux."""
    result = await db.execute(
        select(Webhook).where(Webhook.is_global.is_(True)).order_by(Webhook.created_at.desc())
    )
    webhooks = result.scalars().all()
    return [_webhook_to_response(w) for w in webhooks]


@router.post(
    "/global",
    response_model=WebhookResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("notification.webhook.global.create"))],
)
async def create_global_webhook(
    data: WebhookCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Creer un webhook global."""
    from ...encryption import encrypt_value
    webhook = Webhook(
        user_id=current_user.id,
        is_global=True,
        name=data.name,
        url=data.url,
        secret=encrypt_value(data.secret) if data.secret else None,
        format=data.format,
        prefix=data.prefix,
        event_types=data.event_types,
        notification_rule_ids=data.notification_rule_ids,
    )
    db.add(webhook)
    await db.flush()

    await event_bus.emit(
        "notification.webhook.created",
        db=db,
        actor_id=current_user.id,
        resource_type="webhook",
        resource_id=webhook.id,
        payload={
            "actor_name": f"{current_user.first_name} {current_user.last_name}",
            "webhook_name": webhook.name,
            "webhook_url": webhook.url,
            "is_global": True,
        },
    )

    return _webhook_to_response(webhook)


@router.put(
    "/global/{webhook_id}",
    response_model=WebhookResponse,
    dependencies=[Depends(require_permission("notification.webhook.global.update"))],
)
async def update_global_webhook(
    webhook_id: int,
    data: WebhookUpdate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Modifier un webhook global."""
    result = await db.execute(select(Webhook).where(Webhook.id == webhook_id, Webhook.is_global.is_(True)))
    webhook = result.scalar_one_or_none()
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook global introuvable")

    provided = data.model_dump(exclude_unset=True)
    if "secret" in provided and provided["secret"]:
        from ...encryption import encrypt_value
        provided["secret"] = encrypt_value(provided["secret"])
    for field, value in provided.items():
        setattr(webhook, field, value)
    await db.flush()

    await event_bus.emit(
        "notification.webhook.updated",
        db=db,
        actor_id=current_user.id,
        resource_type="webhook",
        resource_id=webhook.id,
        payload={
            "actor_name": f"{current_user.first_name} {current_user.last_name}",
            "webhook_name": webhook.name,
            "is_global": True,
            "fields_updated": list(provided.keys()),
        },
    )

    return _webhook_to_response(webhook)


@router.delete(
    "/global/{webhook_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("notification.webhook.global.delete"))],
)
async def delete_global_webhook(
    webhook_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Supprimer un webhook global."""
    result = await db.execute(select(Webhook).where(Webhook.id == webhook_id, Webhook.is_global.is_(True)))
    webhook = result.scalar_one_or_none()
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook global introuvable")
    webhook_info = {"id": webhook.id, "name": webhook.name, "url": webhook.url}
    await db.delete(webhook)
    await db.flush()

    await event_bus.emit(
        "notification.webhook.deleted",
        db=db,
        actor_id=current_user.id,
        resource_type="webhook",
        resource_id=webhook_info["id"],
        payload={
            "actor_name": f"{current_user.first_name} {current_user.last_name}",
            "webhook_name": webhook_info["name"],
            "webhook_url": webhook_info["url"],
            "is_global": True,
        },
    )
