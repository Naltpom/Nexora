"""Maintenance commands for the lifecycle feature."""

from ..command_registry import CommandDefinition


async def _check_inactivity(db):
    """Check all active users for inactivity, send warnings or archive."""
    from .services import check_inactivity
    return await check_inactivity(db)


async def _check_archive_expiry(db):
    """Check all archived users, send warnings or delete permanently."""
    from .services import check_archive_expiry
    return await check_archive_expiry(db)


commands = [
    CommandDefinition(
        name="lifecycle.check_inactivity",
        label="Verification inactivite",
        description="Verifie les comptes inactifs, envoie les avertissements et archive apres le seuil",
        handler=_check_inactivity,
        schedule="0 1 * * *",
        config_keys=["LIFECYCLE_INACTIVITY_DAYS"],
        timeout=120,
    ),
    CommandDefinition(
        name="lifecycle.check_archive_expiry",
        label="Verification expiration archives",
        description="Verifie les comptes archives, envoie les avertissements et supprime apres le seuil",
        handler=_check_archive_expiry,
        schedule="0 2 * * *",
        config_keys=["LIFECYCLE_ARCHIVE_DAYS"],
        timeout=120,
    ),
]
