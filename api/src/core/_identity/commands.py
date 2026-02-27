"""Maintenance commands for the _identity feature."""

from datetime import datetime, timedelta, timezone

from ..command_registry import CommandDefinition
from ..config import settings
from .models import CommandExecution, ImpersonationAction, ImpersonationLog, SecurityToken, UserSession
from .services import run_pg_dump


async def _purge_expired_tokens(db):
    """Delete security tokens that are expired or consumed."""
    from ..batch_utils import batch_delete
    from ..database import async_session

    now = datetime.now(timezone.utc)

    # Delete consumed tokens (used_at is set)
    consumed_count = await batch_delete(
        async_session,
        SecurityToken,
        (SecurityToken.used_at.isnot(None),),
    )

    # Delete expired tokens (grace period of 1 day past expiry)
    cutoff = now - timedelta(days=1)
    expired_count = await batch_delete(
        async_session,
        SecurityToken,
        (SecurityToken.expires_at < cutoff,),
    )

    total = consumed_count + expired_count
    return {
        "consumed_purged": consumed_count,
        "expired_purged": expired_count,
        "total_purged": total,
        "message": f"{total} token(s) purge(s)." if total else "Aucun token a purger.",
    }


async def _purge_impersonation_logs(db):
    """Delete impersonation logs older than N days."""
    from ..batch_utils import batch_delete
    from ..database import async_session

    days = settings.IMPERSONATION_LOG_RETENTION_DAYS
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    # Delete actions first (no FK cascade)
    actions_count = await batch_delete(
        async_session,
        ImpersonationAction,
        (ImpersonationAction.occurred_at < cutoff,),
    )

    # Delete logs
    logs_count = await batch_delete(
        async_session,
        ImpersonationLog,
        (ImpersonationLog.started_at < cutoff,),
    )

    return {
        "actions_purged": actions_count,
        "logs_purged": logs_count,
        "retention_days": days,
        "message": f"{logs_count} session(s) et {actions_count} action(s) purgees.",
    }


async def _backup_database(db):
    """Run pg_dump and auto-cleanup old backups."""
    filename = await run_pg_dump()
    return {
        "filename": filename,
        "message": f"Backup cree: {filename}",
    }


async def _purge_command_logs(db):
    """Delete command execution logs older than N days."""
    from ..batch_utils import batch_delete
    from ..database import async_session

    days = settings.COMMAND_LOG_RETENTION_DAYS
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    count = await batch_delete(
        async_session,
        CommandExecution,
        (CommandExecution.executed_at < cutoff,),
    )

    return {
        "purged": count,
        "retention_days": days,
        "message": f"{count} log(s) d'execution purge(s)." if count else "Aucun log a purger.",
    }


async def _purge_expired_sessions(db):
    """Delete revoked or expired user sessions older than N days."""
    from sqlalchemy import or_

    from ..batch_utils import batch_delete
    from ..database import async_session

    days = settings.SESSION_RETENTION_DAYS
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    count = await batch_delete(
        async_session,
        UserSession,
        (
            or_(
                UserSession.is_revoked.is_(True),
                UserSession.expires_at < datetime.now(timezone.utc),
            ),
            UserSession.created_at < cutoff,
        ),
    )

    return {
        "purged": count,
        "retention_days": days,
        "message": f"{count} session(s) purgee(s)." if count else "Aucune session a purger.",
    }


async def _purge_soft_deleted_users(db):
    """Hard-delete users soft-deleted more than 30 days ago (RGPD compliance)."""
    from ..batch_utils import batch_delete
    from ..database import async_session
    from .models import User

    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    count = await batch_delete(
        async_session,
        User,
        (User.deleted_at.isnot(None), User.deleted_at < cutoff),
    )

    return {
        "purged": count,
        "retention_days": 30,
        "message": f"{count} utilisateur(s) supprime(s) definitivement." if count else "Aucun utilisateur a purger.",
    }


commands = [
    CommandDefinition(
        name="_identity.purge_expired_tokens",
        label="Purge des tokens expires",
        description="Supprime les security tokens expires ou consommes",
        handler=_purge_expired_tokens,
        schedule="0 0 * * *",
    ),
    CommandDefinition(
        name="_identity.purge_impersonation_logs",
        label="Purge des logs d'impersonation",
        description="Supprime les logs d'impersonation plus anciens que N jours",
        handler=_purge_impersonation_logs,
        schedule="0 4 1 * *",
        config_keys=["IMPERSONATION_LOG_RETENTION_DAYS"],
    ),
    CommandDefinition(
        name="_identity.backup_database",
        label="Backup de la base de donnees",
        description="Execute pg_dump avec nettoyage automatique des anciens backups (7 jours)",
        handler=_backup_database,
        schedule="0 6 * * *",
    ),
    CommandDefinition(
        name="_identity.purge_command_logs",
        label="Purge des logs de commandes",
        description="Supprime les logs d'execution de commandes plus anciens que N jours",
        handler=_purge_command_logs,
        schedule="0 3 1 * *",
        config_keys=["COMMAND_LOG_RETENTION_DAYS"],
    ),
    CommandDefinition(
        name="_identity.purge_expired_sessions",
        label="Purge des sessions expirees",
        description="Supprime les sessions revoquees ou expirees plus anciennes que N jours",
        handler=_purge_expired_sessions,
        schedule="0 2 * * *",
        config_keys=["SESSION_RETENTION_DAYS"],
    ),
    CommandDefinition(
        name="_identity.purge_soft_deleted_users",
        label="Purge RGPD des utilisateurs supprimes",
        description="Supprime definitivement les utilisateurs soft-deleted depuis plus de 30 jours",
        handler=_purge_soft_deleted_users,
        schedule="0 5 1 * *",
    ),
]
