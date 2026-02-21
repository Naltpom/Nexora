"""Maintenance commands for the event feature."""

from datetime import datetime, timedelta, timezone

from sqlalchemy import delete

from ..command_registry import CommandDefinition
from ..config import settings
from .models import Event


async def _purge_old_events(db):
    """Delete events older than N days. Cascade-deletes associated notifications."""
    days = settings.EVENT_RETENTION_DAYS
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    result = await db.execute(
        delete(Event).where(Event.created_at < cutoff)
    )
    count = result.rowcount

    return {
        "purged_count": count,
        "retention_days": days,
        "message": f"{count} event(s) purge(s)." if count else "Aucun event a purger.",
    }


commands = [
    CommandDefinition(
        name="event.purge_old_events",
        label="Purge des anciens events",
        description="Supprime les events plus anciens que N jours (cascade: notifications associees)",
        handler=_purge_old_events,
        schedule="0 4 * * *",
        config_keys=["EVENT_RETENTION_DAYS"],
    ),
]
