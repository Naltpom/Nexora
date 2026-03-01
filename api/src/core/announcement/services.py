"""Announcement feature services."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

if TYPE_CHECKING:
    from ..pagination import PaginationParams

from .models import Announcement, AnnouncementDismissal


async def get_user_role_slugs(db: AsyncSession, user_id: int) -> list[str]:
    """Return the list of role slugs for a given user."""
    from .._identity.models import Role, UserRole

    result = await db.execute(
        select(Role.slug).join(UserRole, UserRole.role_id == Role.id).where(
            UserRole.user_id == user_id,
        )
    )
    return [row[0] for row in result.all()]


def _active_filter(now: datetime):
    """Common filter clauses for active announcements."""
    return [
        Announcement.is_active.is_(True),
        Announcement.start_date <= now,
        or_(Announcement.end_date.is_(None), Announcement.end_date > now),
    ]


def _dismissed_subq(user_id: int):
    """Subquery for dismissed announcement IDs."""
    return (
        select(AnnouncementDismissal.announcement_id)
        .where(AnnouncementDismissal.user_id == user_id)
        .scalar_subquery()
    )


def _filter_by_roles(announcements, role_slugs: list[str]):
    """Filter announcements by target_roles (None = all users)."""
    return [a for a in announcements if a.target_roles is None or any(slug in a.target_roles for slug in role_slugs)]


# -- Banner endpoints -----------------------------------------------------------


async def list_active_announcements(
    db: AsyncSession,
    user_id: int,
) -> list[dict]:
    """Get active banner announcements for a user, excluding dismissed ones."""
    now = datetime.now(timezone.utc)

    query = (
        select(Announcement)
        .where(
            *_active_filter(now),
            Announcement.display == "banner",
            Announcement.id.notin_(_dismissed_subq(user_id)),
        )
        .order_by(Announcement.priority.desc(), Announcement.created_at.desc())
    )

    result = await db.execute(query)
    announcements = result.scalars().all()

    role_slugs = await get_user_role_slugs(db, user_id)

    return [
        {
            "id": a.id,
            "title": a.title,
            "body": a.body,
            "type": a.type,
            "display": a.display,
            "requires_acknowledgment": a.requires_acknowledgment,
            "is_dismissible": a.is_dismissible,
            "priority": a.priority,
            "start_date": a.start_date,
            "end_date": a.end_date,
            "created_at": a.created_at,
        }
        for a in _filter_by_roles(announcements, role_slugs)
    ]


# -- Modal endpoints -----------------------------------------------------------


async def list_active_modal_announcements(
    db: AsyncSession,
    user_id: int,
) -> list[dict]:
    """Get active modal announcements not yet read/acknowledged by user."""
    now = datetime.now(timezone.utc)

    query = (
        select(Announcement)
        .where(
            *_active_filter(now),
            Announcement.display == "modal",
            Announcement.id.notin_(_dismissed_subq(user_id)),
        )
        .order_by(Announcement.requires_acknowledgment.desc(), Announcement.priority.desc(), Announcement.created_at.desc())
    )

    result = await db.execute(query)
    announcements = result.scalars().all()

    role_slugs = await get_user_role_slugs(db, user_id)

    return [
        {
            "id": a.id,
            "title": a.title,
            "body": a.body,
            "type": a.type,
            "requires_acknowledgment": a.requires_acknowledgment,
            "priority": a.priority,
            "start_date": a.start_date,
            "end_date": a.end_date,
            "created_at": a.created_at,
            "is_read": False,
        }
        for a in _filter_by_roles(announcements, role_slugs)
    ]


async def count_unread_modal_announcements(
    db: AsyncSession,
    user_id: int,
) -> int:
    """Count active modal announcements not yet read by user."""
    now = datetime.now(timezone.utc)

    query = (
        select(func.count(Announcement.id))
        .where(
            *_active_filter(now),
            Announcement.display == "modal",
            Announcement.id.notin_(_dismissed_subq(user_id)),
        )
    )

    result = await db.execute(query)
    total = result.scalar() or 0

    # Further filter by roles (need to count manually since role filtering is in Python)
    if total > 0:
        items = await list_active_modal_announcements(db, user_id)
        return len(items)

    return 0


async def list_modal_announcements_user(
    db: AsyncSession,
    user_id: int,
    pagination: PaginationParams,
) -> tuple[list[dict], int, int]:
    """Paginated list of modal announcements for a user (history page) with read status."""
    from ..pagination import paginate

    now = datetime.now(timezone.utc)

    query = (
        select(Announcement, AnnouncementDismissal.dismissed_at)
        .outerjoin(
            AnnouncementDismissal,
            (AnnouncementDismissal.announcement_id == Announcement.id)
            & (AnnouncementDismissal.user_id == user_id),
        )
        .where(
            *_active_filter(now),
            Announcement.display == "modal",
        )
    )

    # Filter by user roles in Python after fetching
    sort_whitelist = {
        "created_at": Announcement.created_at,
        "priority": Announcement.priority,
        "start_date": Announcement.start_date,
    }

    result, total, pages = await paginate(
        db, query, pagination,
        sort_whitelist=sort_whitelist,
        default_sort_column=Announcement.created_at,
    )

    role_slugs = await get_user_role_slugs(db, user_id)

    rows = []
    for ann, dismissed_at in result.all():
        if ann.target_roles is not None and not any(slug in ann.target_roles for slug in role_slugs):
            continue
        rows.append({
            "id": ann.id,
            "title": ann.title,
            "body": ann.body,
            "type": ann.type,
            "requires_acknowledgment": ann.requires_acknowledgment,
            "priority": ann.priority,
            "start_date": ann.start_date,
            "end_date": ann.end_date,
            "created_at": ann.created_at,
            "is_read": dismissed_at is not None,
        })

    return rows, total, pages


# -- Admin endpoints -----------------------------------------------------------


async def list_announcements_admin(
    db: AsyncSession,
    pagination: PaginationParams,
) -> tuple[list[dict], int, int]:
    """Admin paginated list of all announcements with acknowledgment counts."""
    from .._identity.models import User
    from ..pagination import paginate, search_like_pattern

    # Acknowledgment subquery
    ack_count_subq = (
        select(func.count(AnnouncementDismissal.id))
        .where(AnnouncementDismissal.announcement_id == Announcement.id)
        .correlate(Announcement)
        .scalar_subquery()
    )

    query = (
        select(Announcement, User, ack_count_subq.label("ack_count"))
        .outerjoin(User, Announcement.created_by_id == User.id)
    )

    if pagination.search:
        like = search_like_pattern(pagination.search)
        query = query.where(
            or_(
                Announcement.title.ilike(like),
                Announcement.body.ilike(like),
            )
        )

    sort_whitelist = {
        "created_at": Announcement.created_at,
        "title": Announcement.title,
        "priority": Announcement.priority,
        "start_date": Announcement.start_date,
        "is_active": Announcement.is_active,
    }
    result, total, pages = await paginate(
        db, query, pagination,
        sort_whitelist=sort_whitelist,
        default_sort_column=Announcement.created_at,
    )

    # Count total targetable users for acknowledgment tracking
    from .._identity.models import Role, UserRole
    total_users_count = await db.scalar(select(func.count(User.id)).where(User.is_active.is_(True)))

    rows = []
    for ann, creator, ack_count in result.all():
        # If target_roles is set, count users with those roles
        if ann.target_roles:
            target_count_q = (
                select(func.count(func.distinct(UserRole.user_id)))
                .join(Role, UserRole.role_id == Role.id)
                .where(Role.slug.in_(ann.target_roles))
            )
            target_count = await db.scalar(target_count_q) or 0
        else:
            target_count = total_users_count or 0

        rows.append({
            "id": ann.id,
            "title": ann.title,
            "body": ann.body,
            "type": ann.type,
            "display": ann.display,
            "requires_acknowledgment": ann.requires_acknowledgment,
            "target_roles": ann.target_roles,
            "start_date": ann.start_date,
            "end_date": ann.end_date,
            "is_dismissible": ann.is_dismissible,
            "priority": ann.priority,
            "is_active": ann.is_active,
            "created_by_id": ann.created_by_id,
            "created_by_name": f"{creator.first_name} {creator.last_name}" if creator else None,
            "acknowledged_count": ack_count or 0,
            "target_count": target_count,
            "created_at": ann.created_at,
            "updated_at": ann.updated_at,
        })

    return rows, total, pages


async def get_acknowledgment_details(
    db: AsyncSession,
    announcement_id: int,
) -> list[dict]:
    """Get list of users who acknowledged a specific announcement."""
    from .._identity.models import User

    query = (
        select(User, AnnouncementDismissal.dismissed_at)
        .join(AnnouncementDismissal, AnnouncementDismissal.user_id == User.id)
        .where(AnnouncementDismissal.announcement_id == announcement_id)
        .order_by(AnnouncementDismissal.dismissed_at.desc())
    )
    result = await db.execute(query)

    return [
        {
            "user_id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "acknowledged_at": dismissed_at,
        }
        for user, dismissed_at in result.all()
    ]


# -- Shared -------------------------------------------------------------------


async def dismiss_announcement(
    db: AsyncSession,
    announcement_id: int,
    user_id: int,
) -> bool:
    """Dismiss/acknowledge an announcement for a user. Returns False if not found."""
    result = await db.execute(
        select(Announcement).where(Announcement.id == announcement_id)
    )
    ann = result.scalar_one_or_none()
    if not ann:
        return False

    # For banners: check is_dismissible. For modals: always allow.
    if ann.display == "banner" and not ann.is_dismissible:
        return False

    existing = await db.execute(
        select(AnnouncementDismissal).where(
            AnnouncementDismissal.announcement_id == announcement_id,
            AnnouncementDismissal.user_id == user_id,
        )
    )
    if existing.scalar_one_or_none():
        return True

    db.add(AnnouncementDismissal(
        announcement_id=announcement_id,
        user_id=user_id,
    ))
    await db.flush()
    return True
