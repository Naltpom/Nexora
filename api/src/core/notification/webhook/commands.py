"""Maintenance commands for the notification.webhook feature."""

from datetime import datetime, timedelta, timezone

from sqlalchemy import delete

from ...command_registry import CommandDefinition
from ...config import settings
from .models import WebhookDeliveryLog


async def _purge_delivery_logs(db):
    """Delete webhook delivery logs older than N days."""
    days = settings.DELIVERY_LOG_RETENTION_DAYS
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    result = await db.execute(
        delete(WebhookDeliveryLog).where(WebhookDeliveryLog.created_at < cutoff)
    )
    count = result.rowcount

    return {
        "purged": count,
        "retention_days": days,
        "message": f"{count} log(s) de livraison purge(s)." if count else "Aucun log a purger.",
    }


commands = [
    CommandDefinition(
        name="notification.webhook.purge_delivery_logs",
        label="Purge des logs de livraison webhook",
        description="Supprime les logs de livraison webhook plus anciens que N jours",
        handler=_purge_delivery_logs,
        schedule="0 3 * * *",
        config_keys=["DELIVERY_LOG_RETENTION_DAYS"],
    ),
]
