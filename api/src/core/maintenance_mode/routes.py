"""Maintenance mode routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..events import event_bus
from ..permissions import require_permission
from ..security import get_current_user
from .models import MaintenanceWindow
from .schemas import (
    MaintenanceActivate,
    MaintenanceSchedule,
    MaintenanceStatusResponse,
    MaintenanceWindowResponse,
)
from .services import (
    activate_maintenance,
    deactivate_maintenance,
    get_current_maintenance,
    schedule_maintenance,
)

router = APIRouter()


# -- Public endpoint (no auth) -------------------------------------------------


@router.get("/status", response_model=MaintenanceStatusResponse)
async def maintenance_status(db: AsyncSession = Depends(get_db)):
    """Public: check if maintenance mode is active."""
    window = await get_current_maintenance(db)
    if window:
        return MaintenanceStatusResponse(
            is_active=True,
            message=window.message,
            scheduled_end=window.scheduled_end,
        )
    return MaintenanceStatusResponse(is_active=False)


# -- Admin endpoints -----------------------------------------------------------


@router.post(
    "/activate",
    response_model=MaintenanceWindowResponse,
    dependencies=[Depends(require_permission("maintenance_mode.manage"))],
)
async def activate(
    data: MaintenanceActivate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Activate maintenance mode immediately."""
    window = await activate_maintenance(
        db, current_user.id, data.message, data.bypass_roles,
    )

    await event_bus.emit(
        "maintenance_mode.activated",
        db=db,
        actor_id=current_user.id,
        resource_type="maintenance_window",
        resource_id=window.id,
        payload={
            "actor_name": f"{current_user.first_name} {current_user.last_name}",
            "message": data.message,
        },
    )

    return MaintenanceWindowResponse(
        id=window.id,
        is_active=window.is_active,
        message=window.message,
        scheduled_start=window.scheduled_start,
        scheduled_end=window.scheduled_end,
        bypass_roles=window.bypass_roles,
        created_by_id=window.created_by_id,
        created_by_name=f"{current_user.first_name} {current_user.last_name}",
        created_at=window.created_at,
        updated_at=window.updated_at,
    )


@router.post(
    "/deactivate",
    dependencies=[Depends(require_permission("maintenance_mode.manage"))],
)
async def deactivate(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Deactivate maintenance mode."""
    await deactivate_maintenance(db, current_user.id)

    await event_bus.emit(
        "maintenance_mode.deactivated",
        db=db,
        actor_id=current_user.id,
        resource_type="maintenance_window",
        resource_id=0,
        payload={
            "actor_name": f"{current_user.first_name} {current_user.last_name}",
        },
    )

    return {"ok": True}


@router.post(
    "/schedule",
    response_model=MaintenanceWindowResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("maintenance_mode.manage"))],
)
async def schedule(
    data: MaintenanceSchedule,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Schedule a future maintenance window."""
    window = await schedule_maintenance(
        db, current_user.id, data.message,
        data.scheduled_start, data.scheduled_end, data.bypass_roles,
    )

    await event_bus.emit(
        "maintenance_mode.scheduled",
        db=db,
        actor_id=current_user.id,
        resource_type="maintenance_window",
        resource_id=window.id,
        payload={
            "actor_name": f"{current_user.first_name} {current_user.last_name}",
            "scheduled_start": data.scheduled_start.isoformat(),
            "scheduled_end": data.scheduled_end.isoformat() if data.scheduled_end else None,
        },
    )

    return MaintenanceWindowResponse(
        id=window.id,
        is_active=window.is_active,
        message=window.message,
        scheduled_start=window.scheduled_start,
        scheduled_end=window.scheduled_end,
        bypass_roles=window.bypass_roles,
        created_by_id=window.created_by_id,
        created_by_name=f"{current_user.first_name} {current_user.last_name}",
        created_at=window.created_at,
        updated_at=window.updated_at,
    )


@router.get(
    "/windows",
    response_model=list[MaintenanceWindowResponse],
    dependencies=[Depends(require_permission("maintenance_mode.manage"))],
)
async def list_windows(db: AsyncSession = Depends(get_db)):
    """List all maintenance windows (active and scheduled)."""
    from .._identity.models import User

    result = await db.execute(
        select(MaintenanceWindow).order_by(MaintenanceWindow.scheduled_start.desc())
    )
    windows = result.scalars().all()

    items = []
    for w in windows:
        creator_name = None
        if w.created_by_id:
            creator = await db.scalar(select(User).where(User.id == w.created_by_id))
            if creator:
                creator_name = f"{creator.first_name} {creator.last_name}"

        items.append(MaintenanceWindowResponse(
            id=w.id,
            is_active=w.is_active,
            message=w.message,
            scheduled_start=w.scheduled_start,
            scheduled_end=w.scheduled_end,
            bypass_roles=w.bypass_roles,
            created_by_id=w.created_by_id,
            created_by_name=creator_name,
            created_at=w.created_at,
            updated_at=w.updated_at,
        ))

    return items


@router.delete(
    "/windows/{window_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("maintenance_mode.manage"))],
)
async def delete_window(
    window_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a maintenance window."""
    result = await db.execute(
        select(MaintenanceWindow).where(MaintenanceWindow.id == window_id)
    )
    window = result.scalar_one_or_none()
    if not window:
        raise HTTPException(status_code=404, detail="Fenetre de maintenance introuvable")

    was_active = window.is_active
    await db.delete(window)
    await db.flush()

    if was_active:
        from ..realtime.services import sse_broadcaster
        from .services import invalidate_cache
        invalidate_cache()
        await sse_broadcaster.broadcast_all(
            event_type="maintenance_mode",
            data={"action": "deactivated", "is_active": False, "message": None, "scheduled_end": None},
        )
