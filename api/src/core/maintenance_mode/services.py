"""Maintenance mode services with in-memory cache."""

import logging
import time
from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..realtime.services import sse_broadcaster
from .models import MaintenanceWindow

logger = logging.getLogger(__name__)

# ── In-memory cache (singleton, TTL 10s) ────────────────────────────


@dataclass
class _CachedState:
    is_active: bool
    message: str | None
    scheduled_end: datetime | None
    bypass_roles: list[str]
    fetched_at: float  # time.monotonic()


_cache: _CachedState | None = None
_CACHE_TTL = 10.0  # seconds


def _is_cache_stale() -> bool:
    if _cache is None:
        return True
    return (time.monotonic() - _cache.fetched_at) > _CACHE_TTL


def get_cached_state() -> _CachedState | None:
    if _is_cache_stale():
        return None
    return _cache


def invalidate_cache() -> None:
    global _cache
    _cache = None


async def refresh_cache_from_db(db: AsyncSession) -> _CachedState | None:
    global _cache

    result = await db.execute(
        select(MaintenanceWindow)
        .where(MaintenanceWindow.is_active == True)
        .order_by(MaintenanceWindow.scheduled_start.desc())
        .limit(1)
    )
    window = result.scalar_one_or_none()

    if window:
        _cache = _CachedState(
            is_active=True,
            message=window.message,
            scheduled_end=window.scheduled_end,
            bypass_roles=window.bypass_roles or ["super_admin", "admin"],
            fetched_at=time.monotonic(),
        )
    else:
        _cache = _CachedState(
            is_active=False,
            message=None,
            scheduled_end=None,
            bypass_roles=[],
            fetched_at=time.monotonic(),
        )

    return _cache


# ── CRUD operations ──────────────────────────────────────────────────


async def get_current_maintenance(db: AsyncSession) -> MaintenanceWindow | None:
    result = await db.execute(
        select(MaintenanceWindow)
        .where(MaintenanceWindow.is_active == True)
        .order_by(MaintenanceWindow.scheduled_start.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def activate_maintenance(
    db: AsyncSession,
    user_id: int,
    message: str | None = None,
    bypass_roles: list[str] | None = None,
) -> MaintenanceWindow:
    now = datetime.now(timezone.utc)
    window = MaintenanceWindow(
        is_active=True,
        message=message,
        scheduled_start=now,
        bypass_roles=bypass_roles or ["super_admin", "admin"],
        created_by_id=user_id,
    )
    db.add(window)
    await db.flush()

    invalidate_cache()

    await sse_broadcaster.broadcast_all(
        event_type="maintenance_mode",
        data={
            "action": "activated",
            "is_active": True,
            "message": message,
            "scheduled_end": None,
        },
    )

    return window


async def deactivate_maintenance(db: AsyncSession, user_id: int) -> None:
    await db.execute(
        update(MaintenanceWindow)
        .where(MaintenanceWindow.is_active == True)
        .values(is_active=False, updated_at=datetime.now(timezone.utc))
    )
    await db.flush()

    invalidate_cache()

    await sse_broadcaster.broadcast_all(
        event_type="maintenance_mode",
        data={
            "action": "deactivated",
            "is_active": False,
            "message": None,
            "scheduled_end": None,
        },
    )


async def schedule_maintenance(
    db: AsyncSession,
    user_id: int,
    message: str | None,
    scheduled_start: datetime,
    scheduled_end: datetime | None,
    bypass_roles: list[str] | None = None,
) -> MaintenanceWindow:
    window = MaintenanceWindow(
        is_active=False,
        message=message,
        scheduled_start=scheduled_start,
        scheduled_end=scheduled_end,
        bypass_roles=bypass_roles or ["super_admin", "admin"],
        created_by_id=user_id,
    )
    db.add(window)
    await db.flush()

    await sse_broadcaster.broadcast_all(
        event_type="maintenance_mode",
        data={
            "action": "scheduled",
            "is_active": False,
            "message": message,
            "scheduled_start": scheduled_start.isoformat() if scheduled_start else None,
            "scheduled_end": scheduled_end.isoformat() if scheduled_end else None,
        },
    )

    return window


async def check_scheduled_windows(db: AsyncSession) -> dict:
    """Cron handler: activate/deactivate windows based on schedule."""
    now = datetime.now(timezone.utc)
    activated = 0
    deactivated = 0

    # Activate windows whose scheduled_start has passed and are not yet active
    result = await db.execute(
        select(MaintenanceWindow).where(
            MaintenanceWindow.is_active == False,
            MaintenanceWindow.scheduled_start <= now,
            # Only activate if scheduled_end is null or in the future
        )
    )
    for window in result.scalars().all():
        # Skip if scheduled_end is in the past
        if window.scheduled_end and window.scheduled_end <= now:
            continue
        window.is_active = True
        activated += 1

    # Deactivate windows whose scheduled_end has passed
    result = await db.execute(
        select(MaintenanceWindow).where(
            MaintenanceWindow.is_active == True,
            MaintenanceWindow.scheduled_end.is_not(None),
            MaintenanceWindow.scheduled_end <= now,
        )
    )
    for window in result.scalars().all():
        window.is_active = False
        deactivated += 1

    if activated or deactivated:
        await db.flush()
        invalidate_cache()

        # Determine current state after changes
        current = await get_current_maintenance(db)
        is_active = current is not None
        await sse_broadcaster.broadcast_all(
            event_type="maintenance_mode",
            data={
                "action": "activated" if is_active else "deactivated",
                "is_active": is_active,
                "message": current.message if current else None,
                "scheduled_end": current.scheduled_end.isoformat() if current and current.scheduled_end else None,
            },
        )

    return {"activated": activated, "deactivated": deactivated}


async def user_has_bypass_role(db: AsyncSession, user_id: int, bypass_roles: list[str]) -> bool:
    """Check if a user has any of the bypass roles."""
    from .._identity.models import Role, UserRole

    result = await db.execute(
        select(Role.slug)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(UserRole.user_id == user_id, Role.slug.in_(bypass_roles))
        .limit(1)
    )
    return result.scalar_one_or_none() is not None
