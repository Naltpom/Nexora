"""RGPD maintenance commands — audit log and consent purge."""

from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select

from ..command_registry import CommandDefinition
from .models import ConsentRecord, DataAccessLog


async def _purge_audit_logs(db):
    """Purge data access audit logs older than 365 days."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=365)

    result = await db.execute(
        select(DataAccessLog).where(DataAccessLog.created_at < cutoff)
    )
    logs = result.scalars().all()
    count = len(logs)

    if count:
        await db.execute(
            delete(DataAccessLog).where(DataAccessLog.created_at < cutoff)
        )

    return {
        "purged": count,
        "retention_days": 365,
        "message": f"{count} log(s) d'audit supprime(s)." if count else "Aucun log a purger.",
    }


async def _purge_old_consents(db):
    """Purge consent records older than 3 years (1095 days)."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=1095)

    result = await db.execute(
        select(ConsentRecord).where(ConsentRecord.created_at < cutoff)
    )
    records = result.scalars().all()
    count = len(records)

    if count:
        await db.execute(
            delete(ConsentRecord).where(ConsentRecord.created_at < cutoff)
        )

    return {
        "purged": count,
        "retention_days": 1095,
        "message": f"{count} enregistrement(s) de consentement supprime(s)." if count else "Aucun consentement a purger.",
    }


commands = [
    CommandDefinition(
        name="rgpd.purge_audit_logs",
        label="Purge des logs d'audit RGPD",
        description="Supprime les logs d'acces aux donnees personnelles de plus de 365 jours",
        handler=_purge_audit_logs,
        schedule="0 4 1 * *",
    ),
    CommandDefinition(
        name="rgpd.purge_old_consents",
        label="Purge des anciens consentements",
        description="Supprime les enregistrements de consentement de plus de 3 ans",
        handler=_purge_old_consents,
        schedule="0 4 1 * *",
    ),
]
