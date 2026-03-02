"""Maintenance mode cron commands."""

from ..command_registry import CommandDefinition


async def _check_schedule(db):
    """Check and activate/deactivate scheduled maintenance windows."""
    from .services import check_scheduled_windows
    return await check_scheduled_windows(db)


commands = [
    CommandDefinition(
        name="maintenance_mode.check_schedule",
        label="Verification planification maintenance",
        description="Active/desactive les fenetres de maintenance selon le planning",
        handler=_check_schedule,
        schedule="* * * * *",
        timeout=30,
    ),
]
