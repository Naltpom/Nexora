"""Lifecycle services: inactivity check, archive expiry, reactivation, dashboard."""

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..events import event_bus
from ..i18n.translations import t
from .models import LifecycleEmail

logger = logging.getLogger(__name__)

# Warning email thresholds for inactivity (days before archive)
_INACTIVITY_WARNINGS = [
    ("inactivity_6m", 183),   # 6 months before
    ("inactivity_2m", 61),    # 2 months before
    ("inactivity_2w", 14),    # 2 weeks before
    ("inactivity_3d", 3),     # 3 days before
]

# Warning email thresholds for deletion (days after archive)
_DELETION_WARNINGS = [
    ("deletion_6m", 183),     # 6 months after archive
    ("deletion_2m", 305),     # 10 months after archive
    ("deletion_2w", 350),     # ~11.5 months after archive
    ("deletion_3d", 362),     # ~11.9 months after archive
]


def _super_admin_user_ids():
    """Subquery returning user IDs that hold the super_admin role."""
    from .._identity.models import Role, UserRole

    return (
        select(UserRole.user_id)
        .join(Role, Role.id == UserRole.role_id)
        .where(Role.slug == settings.SUPER_ADMIN_ROLE_SLUG)
    )


async def _send_lifecycle_email(
    db: AsyncSession,
    user,
    email_type: str,
) -> bool:
    """Send a lifecycle email if not already sent. Returns True if newly sent.

    Title and body are resolved from i18n keys: lifecycle.<email_type>_title / _body.
    """
    from ..notification.email.services import SmtpEmailSender

    exists = await db.scalar(
        select(LifecycleEmail.id)
        .where(LifecycleEmail.user_id == user.id, LifecycleEmail.email_type == email_type)
    )
    if exists:
        return False

    locale = getattr(user, "language", None) or settings.I18N_DEFAULT_LOCALE
    title = t(f"lifecycle.{email_type}_title", locale, name=user.first_name)
    body = t(f"lifecycle.{email_type}_body", locale, name=user.first_name)

    sender = SmtpEmailSender()
    ok = sender.send_notification(
        to_email=user.email,
        to_name=f"{user.first_name} {user.last_name}",
        title=title,
        body=body,
        link=None,
        locale=locale,
    )

    if ok:
        db.add(LifecycleEmail(user_id=user.id, email_type=email_type))
        await db.flush()
        logger.info("Lifecycle email '%s' sent to user %s (%s)", email_type, user.id, locale)
        return True
    logger.warning("Lifecycle email '%s' failed for user %s", email_type, user.id)
    return False


# ── Inactivity check ────────────────────────────────────────────────────

async def check_inactivity(db: AsyncSession) -> dict:
    """Daily check: warn inactive users or archive them after threshold."""
    from .._identity.models import User, UserSession

    now = datetime.now(timezone.utc)
    inactivity_days = settings.LIFECYCLE_INACTIVITY_DAYS
    archive_cutoff = now - timedelta(days=inactivity_days)

    last_activity = func.coalesce(User.last_active, User.last_login, User.created_at)
    sa_ids = _super_admin_user_ids()

    base_filter = [
        User.is_active == True,
        User.archived_at.is_(None),
        User.deleted_at.is_(None),
        ~User.id.in_(sa_ids),
    ]

    archived_count = 0
    warned_count = 0

    # 1. Archive users past the threshold
    result = await db.execute(
        select(User).where(*base_filter, last_activity < archive_cutoff)
    )
    for user in result.scalars().all():
        try:
            async with db.begin_nested():
                # Race condition guard: re-check last_activity before archiving
                rows = await db.execute(
                    update(User)
                    .where(
                        User.id == user.id,
                        func.coalesce(User.last_active, User.last_login, User.created_at) < archive_cutoff,
                    )
                    .values(is_active=False, archived_at=now)
                )
                if rows.rowcount == 0:
                    logger.info("User %s skipped archival (activity updated since check)", user.id)
                    continue
                await db.execute(
                    update(UserSession)
                    .where(UserSession.user_id == user.id, UserSession.is_revoked.is_(False))
                    .values(is_revoked=True)
                )
                await _send_lifecycle_email(db, user, "archived")
                await event_bus.emit(
                    "lifecycle.user_archived",
                    db=db,
                    actor_id=user.id,
                    resource_type="user",
                    resource_id=user.id,
                    payload={"reason": "inactivity", "inactive_days": inactivity_days},
                )
                archived_count += 1
        except Exception:
            logger.exception("Error archiving user %s", user.id)

    # 2. Send warning emails for users approaching the threshold
    for email_type, days_before in _INACTIVITY_WARNINGS:
        warn_cutoff = now - timedelta(days=inactivity_days - days_before)
        result = await db.execute(
            select(User).where(
                *base_filter,
                last_activity < warn_cutoff,
                last_activity >= archive_cutoff,
                ~User.id.in_(
                    select(LifecycleEmail.user_id)
                    .where(LifecycleEmail.email_type == email_type)
                ),
            )
        )
        for user in result.scalars().all():
            try:
                async with db.begin_nested():
                    if await _send_lifecycle_email(db, user, email_type):
                        warned_count += 1
            except Exception:
                logger.exception("Error sending warning '%s' to user %s", email_type, user.id)

    return {
        "archived_count": archived_count,
        "warned_count": warned_count,
        "message": f"{archived_count} archive(s), {warned_count} avertissement(s).",
    }


# ── Archive expiry check ────────────────────────────────────────────────

async def check_archive_expiry(db: AsyncSession) -> dict:
    """Daily check: warn archived users of upcoming deletion or delete them."""
    from .._identity.models import User

    now = datetime.now(timezone.utc)
    archive_days = settings.LIFECYCLE_ARCHIVE_DAYS
    deletion_cutoff = now - timedelta(days=archive_days)
    sa_ids = _super_admin_user_ids()

    base_filter = [
        User.archived_at.isnot(None),
        User.deleted_at.is_(None),
        ~User.id.in_(sa_ids),
    ]

    deleted_count = 0
    warned_count = 0

    # 1. Delete users past the archive expiry
    result = await db.execute(
        select(User).where(*base_filter, User.archived_at < deletion_cutoff)
    )
    for user in result.scalars().all():
        try:
            async with db.begin_nested():
                await _send_lifecycle_email(db, user, "deleted")
                await event_bus.emit(
                    "lifecycle.user_deleted",
                    db=db,
                    actor_id=user.id,
                    resource_type="user",
                    resource_id=user.id,
                    payload={"reason": "archive_expiry", "archive_days": archive_days},
                )
                # Guard: only delete if still archived (admin may have reactivated)
                rows = await db.execute(
                    delete(User).where(User.id == user.id, User.archived_at.isnot(None))
                )
                if rows.rowcount > 0:
                    deleted_count += 1
        except Exception:
            logger.exception("Error deleting archived user %s", user.id)

    # 2. Send warning emails for archived users approaching deletion
    for email_type, days_after_archive in _DELETION_WARNINGS:
        warn_cutoff = now - timedelta(days=days_after_archive)
        result = await db.execute(
            select(User).where(
                *base_filter,
                User.archived_at < warn_cutoff,
                User.archived_at >= deletion_cutoff,
                ~User.id.in_(
                    select(LifecycleEmail.user_id)
                    .where(LifecycleEmail.email_type == email_type)
                ),
            )
        )
        for user in result.scalars().all():
            try:
                async with db.begin_nested():
                    if await _send_lifecycle_email(db, user, email_type):
                        warned_count += 1
            except Exception:
                logger.exception("Error sending deletion warning '%s' to user %s", email_type, user.id)

    return {
        "deleted_count": deleted_count,
        "warned_count": warned_count,
        "message": f"{deleted_count} suppression(s), {warned_count} avertissement(s).",
    }


# ── Admin actions ────────────────────────────────────────────────────────

async def reactivate_user(db: AsyncSession, user_id: int, actor_id: int) -> dict:
    """Admin action: reactivate an archived user."""
    from .._identity.models import User

    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.archived_at.isnot(None),
            User.deleted_at.is_(None),
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Utilisateur archive introuvable")

    user.is_active = True
    user.archived_at = None

    # Reset lifecycle emails so the warning cycle starts fresh
    await db.execute(delete(LifecycleEmail).where(LifecycleEmail.user_id == user_id))

    await event_bus.emit(
        "lifecycle.user_reactivated",
        db=db,
        actor_id=actor_id,
        resource_type="user",
        resource_id=user_id,
        payload={},
    )

    return {
        "user_id": user_id,
        "email": user.email,
        "message": f"Utilisateur {user.email} reactive.",
    }


async def get_dashboard(db: AsyncSession) -> dict:
    """Get lifecycle dashboard data for admin UI."""
    from .._identity.models import User

    now = datetime.now(timezone.utc)
    inactivity_days = settings.LIFECYCLE_INACTIVITY_DAYS
    archive_days = settings.LIFECYCLE_ARCHIVE_DAYS
    warn_start = now - timedelta(days=inactivity_days - 183)
    last_activity = func.coalesce(User.last_active, User.last_login, User.created_at)
    sa_ids = _super_admin_user_ids()

    total_active = await db.scalar(
        select(func.count()).select_from(User).where(
            User.is_active == True, User.archived_at.is_(None), User.deleted_at.is_(None)
        )
    ) or 0

    total_archived = await db.scalar(
        select(func.count()).select_from(User).where(
            User.archived_at.isnot(None), User.deleted_at.is_(None)
        )
    ) or 0

    # Users approaching archive (inactive > 42 months, not yet archived)
    result = await db.execute(
        select(
            User.id, User.email, User.first_name, User.last_name,
            User.last_active, User.last_login, User.created_at,
        )
        .where(
            User.is_active == True,
            User.archived_at.is_(None),
            User.deleted_at.is_(None),
            ~User.id.in_(sa_ids),
            last_activity < warn_start,
        )
        .order_by(last_activity.asc())
        .limit(50)
    )
    soon_to_archive = []
    for row in result:
        user_last = row.last_active or row.last_login or row.created_at
        inactive_days = (now - user_last).days if user_last else 0
        days_until = max(0, inactivity_days - inactive_days)
        soon_to_archive.append({
            "id": row.id, "email": row.email,
            "first_name": row.first_name, "last_name": row.last_name,
            "last_active": user_last.isoformat() if user_last else None,
            "days_until_action": days_until,
        })

    # Archived users approaching deletion
    result = await db.execute(
        select(User.id, User.email, User.first_name, User.last_name, User.archived_at)
        .where(User.archived_at.isnot(None), User.deleted_at.is_(None))
        .order_by(User.archived_at.asc())
        .limit(50)
    )
    archived_users = []
    for row in result:
        days_archived = (now - row.archived_at).days
        days_until = max(0, archive_days - days_archived)
        archived_users.append({
            "id": row.id, "email": row.email,
            "first_name": row.first_name, "last_name": row.last_name,
            "archived_at": row.archived_at.isoformat(),
            "days_until_action": days_until,
        })

    return {
        "total_active": total_active,
        "total_archived": total_archived,
        "inactivity_days": inactivity_days,
        "archive_days": archive_days,
        "soon_to_archive": soon_to_archive,
        "archived_users": archived_users,
    }


def get_lifecycle_settings() -> dict:
    """Get current lifecycle settings (from env)."""
    return {
        "inactivity_days": settings.LIFECYCLE_INACTIVITY_DAYS,
        "archive_days": settings.LIFECYCLE_ARCHIVE_DAYS,
    }


