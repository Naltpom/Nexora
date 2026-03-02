"""Dashboard feature services."""

import time
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import DashboardLayout

# ── Default layouts ──────────────────────────────────────────────────────

DEFAULT_ADMIN_WIDGETS = [
    {"widget_id": "stats_users", "position": 0, "size": "half"},
    {"widget_id": "stats_events", "position": 1, "size": "half"},
    {"widget_id": "stats_notifications", "position": 2, "size": "half"},
    {"widget_id": "stats_invitations", "position": 3, "size": "half"},
    {"widget_id": "activity_feed", "position": 4, "size": "full"},
    {"widget_id": "system_health", "position": 5, "size": "full"},
    {"widget_id": "quick_links_admin", "position": 6, "size": "half"},
    {"widget_id": "quick_links_user", "position": 7, "size": "half"},
]

DEFAULT_USER_WIDGETS = [
    {"widget_id": "welcome_banner", "position": 0, "size": "full"},
    {"widget_id": "stats_notifications", "position": 1, "size": "half"},
    {"widget_id": "quick_links_user", "position": 2, "size": "half"},
    {"widget_id": "activity_feed", "position": 3, "size": "full"},
    {"widget_id": "feature_showcase", "position": 4, "size": "full"},
]

_START_TIME = time.time()


# ── Layout CRUD ──────────────────────────────────────────────────────────


async def get_user_layout(
    db: AsyncSession,
    user_id: int,
    role_slugs: list[str],
) -> tuple[list[dict], str]:
    """Resolve layout: user -> role -> default. Returns (widgets, source)."""
    # 1. User-specific layout
    result = await db.execute(
        select(DashboardLayout).where(DashboardLayout.user_id == user_id)
    )
    layout = result.scalar_one_or_none()
    if layout:
        return layout.widgets, "user"

    # 2. Role-based layout (first match)
    for slug in role_slugs:
        result = await db.execute(
            select(DashboardLayout).where(
                DashboardLayout.role_slug == slug,
                DashboardLayout.user_id.is_(None),
            )
        )
        layout = result.scalar_one_or_none()
        if layout:
            return layout.widgets, "role"

    # 3. Default layout
    result = await db.execute(
        select(DashboardLayout).where(
            DashboardLayout.is_default.is_(True),
            DashboardLayout.user_id.is_(None),
            DashboardLayout.role_slug.is_(None),
        )
    )
    layout = result.scalar_one_or_none()
    if layout:
        return layout.widgets, "default"

    # 4. Hardcoded fallback based on roles
    has_admin = any(s in ("super_admin", "admin") for s in role_slugs)
    if has_admin:
        return DEFAULT_ADMIN_WIDGETS, "default"
    return DEFAULT_USER_WIDGETS, "default"


async def save_user_layout(
    db: AsyncSession,
    user_id: int,
    widgets: list[dict],
) -> None:
    """Save or update the user's personal layout."""
    result = await db.execute(
        select(DashboardLayout).where(DashboardLayout.user_id == user_id)
    )
    layout = result.scalar_one_or_none()
    if layout:
        layout.widgets = widgets
    else:
        db.add(DashboardLayout(user_id=user_id, widgets=widgets))
    await db.flush()


async def delete_user_layout(db: AsyncSession, user_id: int) -> bool:
    """Delete the user's personal layout (reset to default). Returns True if found."""
    result = await db.execute(
        select(DashboardLayout).where(DashboardLayout.user_id == user_id)
    )
    layout = result.scalar_one_or_none()
    if not layout:
        return False
    await db.delete(layout)
    await db.flush()
    return True


# ── Admin default layouts ────────────────────────────────────────────────


async def get_default_layout(
    db: AsyncSession,
    role_slug: str | None,
) -> DashboardLayout | None:
    """Get the default layout for a role (or global default if role_slug is None)."""
    if role_slug:
        result = await db.execute(
            select(DashboardLayout).where(
                DashboardLayout.role_slug == role_slug,
                DashboardLayout.user_id.is_(None),
            )
        )
    else:
        result = await db.execute(
            select(DashboardLayout).where(
                DashboardLayout.is_default.is_(True),
                DashboardLayout.user_id.is_(None),
                DashboardLayout.role_slug.is_(None),
            )
        )
    return result.scalar_one_or_none()


async def save_default_layout(
    db: AsyncSession,
    role_slug: str | None,
    widgets: list[dict],
) -> None:
    """Save the default layout for a role (or global default)."""
    layout = await get_default_layout(db, role_slug)
    if layout:
        layout.widgets = widgets
    else:
        db.add(DashboardLayout(
            role_slug=role_slug,
            is_default=role_slug is None,
            widgets=widgets,
        ))
    await db.flush()


async def delete_default_layout(
    db: AsyncSession,
    role_slug: str | None,
) -> bool:
    """Delete the default layout for a role. Returns True if found."""
    layout = await get_default_layout(db, role_slug)
    if not layout:
        return False
    await db.delete(layout)
    await db.flush()
    return True


# ── Widget data endpoints ────────────────────────────────────────────────


async def get_stats_users(db: AsyncSession) -> dict:
    """Get active user count."""
    from .._identity.models import User
    count = await db.scalar(
        select(func.count(User.id)).where(User.is_active.is_(True))
    )
    return {"count": count or 0}


async def get_stats_notifications(db: AsyncSession, user_id: int) -> dict:
    """Get unread notification count for current user."""
    try:
        from ..notification.models import Notification
        count = await db.scalar(
            select(func.count(Notification.id)).where(
                Notification.user_id == user_id,
                Notification.is_read.is_(False),
            )
        )
        return {"count": count or 0}
    except Exception:
        return {"count": 0}


async def get_stats_invitations(db: AsyncSession) -> dict:
    """Get pending invitation count."""
    from .._identity.models import Invitation
    now = datetime.now(timezone.utc)
    count = await db.scalar(
        select(func.count(Invitation.id)).where(
            Invitation.consumed_at.is_(None),
            Invitation.expires_at > now,
        )
    )
    return {"count": count or 0}


async def get_stats_events(db: AsyncSession) -> dict:
    """Get total event count."""
    try:
        from ..event.models import Event
        count = await db.scalar(select(func.count(Event.id)))
        return {"count": count or 0}
    except Exception:
        return {"count": 0}


async def get_activity_feed(db: AsyncSession, limit: int = 8) -> list[dict]:
    """Get recent activity events."""
    try:
        from .._identity.models import User
        from ..event.models import Event
        result = await db.execute(
            select(Event, User.email)
            .outerjoin(User, Event.actor_id == User.id)
            .order_by(Event.created_at.desc())
            .limit(limit)
        )
        return [
            {
                "id": evt.id,
                "event_type": evt.event_type,
                "actor_email": email or "",
                "resource_type": evt.resource_type,
                "resource_id": evt.resource_id,
                "created_at": evt.created_at.isoformat() if evt.created_at else None,
            }
            for evt, email in result.all()
        ]
    except Exception:
        return []


async def get_system_health(db: AsyncSession) -> dict:
    """Get system health data."""
    from .._identity.models import User

    # DB status
    try:
        await db.execute(select(func.now()))
        db_status = "healthy"
    except Exception:
        db_status = "error"

    # Uptime
    uptime_seconds = time.time() - _START_TIME

    # Active users last 24h
    threshold = datetime.now(timezone.utc) - timedelta(hours=24)
    active_24h = await db.scalar(
        select(func.count(User.id)).where(
            User.last_active >= threshold,
            User.is_active.is_(True),
        )
    ) or 0

    # Total users
    total_users = await db.scalar(
        select(func.count(User.id)).where(User.is_active.is_(True))
    ) or 0

    # Features
    from ..feature_registry import get_registry
    registry = get_registry()
    total_features = len(registry.manifests) if registry else 0
    active_features = len(registry.get_active_manifests()) if registry else 0

    return {
        "db_status": db_status,
        "uptime_seconds": round(uptime_seconds, 1),
        "active_users_24h": active_24h,
        "total_users": total_users,
        "total_features": total_features,
        "active_features": active_features,
    }
