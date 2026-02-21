"""Maintenance commands for the push notification feature."""

from datetime import datetime, timedelta, timezone

from sqlalchemy import delete

from ...command_registry import CommandDefinition
from ...config import settings
from .models import PushSubscription


async def _cleanup_stale_subscriptions(db):
    """Delete inactive push subscriptions older than N days."""
    days = settings.PUSH_SUBSCRIPTION_RETENTION_DAYS
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    result = await db.execute(
        delete(PushSubscription).where(
            PushSubscription.is_active.is_(False),
            PushSubscription.updated_at < cutoff,
        )
    )
    count = result.rowcount

    return {
        "purged_count": count,
        "retention_days": days,
        "message": f"{count} subscription(s) inactives purgee(s)." if count else "Aucune subscription a purger.",
    }


commands = [
    CommandDefinition(
        name="notification.push.cleanup_stale",
        label="Nettoyage des subscriptions push inactives",
        description="Supprime les subscriptions push desactivees depuis plus de N jours",
        handler=_cleanup_stale_subscriptions,
        schedule="0 5 * * 0",
        config_keys=["PUSH_SUBSCRIPTION_RETENTION_DAYS"],
    ),
]
