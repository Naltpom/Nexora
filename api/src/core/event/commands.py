"""Maintenance commands for the event feature."""

from datetime import datetime, timedelta, timezone

import sqlalchemy as sa

from ..command_registry import CommandDefinition
from ..config import settings
from .models import Event


async def _purge_old_events(db):
    """Delete events older than N days in batches.

    Note: notifications are purged independently by notification.purge_old
    (no FK CASCADE since events is partitioned).
    """
    from ..batch_utils import batch_delete
    from ..database import async_session

    days = settings.EVENT_RETENTION_DAYS
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    count = await batch_delete(
        async_session,
        Event,
        (Event.created_at < cutoff,),
    )

    return {
        "purged_count": count,
        "retention_days": days,
        "message": f"{count} event(s) purge(s)." if count else "Aucun event a purger.",
    }


async def _partman_maintenance(db):
    """Run pg_partman maintenance to create future partitions."""
    await db.execute(sa.text("SELECT partman.run_maintenance()"))
    return {"message": "pg_partman maintenance completed."}


commands = [
    CommandDefinition(
        name="event.purge_old_events",
        label="Purge des anciens events",
        description="Supprime les events plus anciens que N jours (notifications purgees separement)",
        handler=_purge_old_events,
        schedule="0 4 * * *",
        config_keys=["EVENT_RETENTION_DAYS"],
        timeout=120,
    ),
    CommandDefinition(
        name="event.partman_maintenance",
        label="Maintenance pg_partman",
        description="Execute partman.run_maintenance() pour creer les partitions futures",
        handler=_partman_maintenance,
        schedule="0 1 * * *",
    ),
]
