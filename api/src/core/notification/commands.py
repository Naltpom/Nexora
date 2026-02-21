"""Maintenance commands for the notification feature."""

from ..command_registry import CommandDefinition
from ..config import settings
from .services import purge_deleted_notifications


async def _purge_deleted(db):
    """Hard-delete notifications that were soft-deleted more than N days ago."""
    days = settings.NOTIFICATION_PURGE_DAYS
    count = await purge_deleted_notifications(db, days)
    return {
        "purged_count": count,
        "retention_days": days,
        "message": f"{count} notification(s) purgee(s)." if count else "Aucune notification a purger.",
    }


commands = [
    CommandDefinition(
        name="notification.purge_deleted",
        label="Purge notifications supprimees",
        description="Hard-delete les notifications soft-deleted depuis plus de N jours",
        handler=_purge_deleted,
        schedule="0 3 * * *",
        config_keys=["NOTIFICATION_PURGE_DAYS"],
    ),
]
