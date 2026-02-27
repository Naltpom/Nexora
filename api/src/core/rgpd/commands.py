"""RGPD maintenance commands — audit log and consent purge."""

from datetime import datetime, timedelta, timezone

from ..command_registry import CommandDefinition
from .models import ConsentRecord, DataAccessLog


async def _purge_audit_logs(db):
    """Purge data access audit logs older than 365 days."""
    from ..batch_utils import batch_delete
    from ..database import async_session

    cutoff = datetime.now(timezone.utc) - timedelta(days=365)

    count = await batch_delete(
        async_session,
        DataAccessLog,
        (DataAccessLog.created_at < cutoff,),
    )

    return {
        "purged": count,
        "retention_days": 365,
        "message": f"{count} log(s) d'audit supprime(s)." if count else "Aucun log a purger.",
    }


async def _purge_old_consents(db):
    """Purge consent records older than 3 years (1095 days)."""
    from ..batch_utils import batch_delete
    from ..database import async_session

    cutoff = datetime.now(timezone.utc) - timedelta(days=1095)

    count = await batch_delete(
        async_session,
        ConsentRecord,
        (ConsentRecord.created_at < cutoff,),
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
