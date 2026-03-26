"""Dashboard feature services.

Generic dashboard layout management with plugin-based widget data dispatch.
Features register their own widgets and data providers via the widget_registry.
"""

import logging
import time
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import DashboardLayout

logger = logging.getLogger(__name__)

# ── Default layouts ──────────────────────────────────────────────────────
# Only reference generic template widgets that ship with the core.

DEFAULT_ADMIN_WIDGETS = [
    {"widget_id": "stats_users", "position": 0, "size": "half"},
    {"widget_id": "stats_events", "position": 1, "size": "half"},
    {"widget_id": "stats_notifications", "position": 2, "size": "half"},
    {"widget_id": "stats_invitations", "position": 3, "size": "half"},
    {"widget_id": "activity_feed", "position": 4, "size": "full", "height": 2},
    {"widget_id": "system_health", "position": 5, "size": "full"},
    {"widget_id": "quick_links_admin", "position": 6, "size": "half"},
    {"widget_id": "quick_links_user", "position": 7, "size": "half"},
]

DEFAULT_USER_WIDGETS = [
    {"widget_id": "welcome_banner", "position": 0, "size": "full"},
    {"widget_id": "stats_notifications", "position": 1, "size": "half"},
    {"widget_id": "quick_links_user", "position": 2, "size": "half"},
    {"widget_id": "activity_feed", "position": 3, "size": "full", "height": 2},
    {"widget_id": "feature_showcase", "position": 4, "size": "full"},
]

_START_TIME = time.time()


# ── Layout CRUD ──────────────────────────────────────────────────────────


async def get_user_layout(
    db: AsyncSession,
    user_id: int,
    role_slugs: list[str],
    user_perms: dict[str, bool | None] | None = None,
    active_features: set[str] | None = None,
) -> tuple[list[dict], str, bool]:
    """Resolve layout: user -> role -> default. Returns (widgets, source, full_width).

    When user_perms and active_features are provided, non-user layouts are
    filtered to only include widgets the user has access to.
    """
    # 1. User-specific layout (no filtering - user chose these)
    result = await db.execute(
        select(DashboardLayout).where(DashboardLayout.user_id == user_id)
    )
    layout = result.scalar_one_or_none()
    if layout:
        return layout.widgets, "user", layout.full_width

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
            widgets = _filter_widgets(layout.widgets, user_perms, active_features)
            return widgets, "role", layout.full_width

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
        widgets = _filter_widgets(layout.widgets, user_perms, active_features)
        return widgets, "default", layout.full_width

    # 4. Hardcoded fallback based on roles
    has_admin = any(s in ("super_admin", "admin") for s in role_slugs)
    widgets = DEFAULT_ADMIN_WIDGETS if has_admin else DEFAULT_USER_WIDGETS
    widgets = _filter_widgets(widgets, user_perms, active_features)
    return widgets, "default", False


def _filter_widgets(
    widgets: list[dict],
    user_perms: dict[str, bool | None] | None,
    active_features: set[str] | None,
) -> list[dict]:
    """Filter widgets by permission and feature gate when context is available."""
    if user_perms is None or active_features is None:
        return widgets
    from .widget_registry import widget_registry
    available_ids = {w.id for w in widget_registry.get_available(user_perms, active_features)}
    return [w for w in widgets if w["widget_id"] in available_ids]


async def save_user_layout(
    db: AsyncSession,
    user_id: int,
    widgets: list[dict],
    full_width: bool = False,
) -> None:
    """Save or update the user's personal layout."""
    result = await db.execute(
        select(DashboardLayout).where(DashboardLayout.user_id == user_id)
    )
    layout = result.scalar_one_or_none()
    if layout:
        layout.widgets = widgets
        layout.full_width = full_width
    else:
        db.add(DashboardLayout(user_id=user_id, widgets=widgets, full_width=full_width))
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


# ── Generic widget data dispatch ─────────────────────────────────────────


async def get_widget_data(db: AsyncSession, widget_id: str, **kwargs) -> dict | list | None:
    """Dispatch to the registered data provider for a widget.

    Returns None if the widget has no data provider registered.
    Features register data providers via WidgetDefinition.data_provider.
    """
    from .widget_registry import widget_registry

    widget = widget_registry.get_by_id(widget_id)
    if not widget or not widget.data_provider:
        return None
    return await widget.data_provider(db, **kwargs)


# ── Core widget data functions ───────────────────────────────────────────
# These are the data providers for the built-in template widgets.
# Project-specific widget data providers are registered by features.


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
