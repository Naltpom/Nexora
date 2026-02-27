"""Lifecycle feature routes: dashboard, reactivation, settings."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..permissions import require_permission
from ..security import get_current_user
from .schemas import LifecycleDashboardResponse, LifecycleSettingsResponse, ReactivateResponse
from .services import get_dashboard, get_lifecycle_settings, reactivate_user

router = APIRouter()


@router.get(
    "/dashboard",
    response_model=LifecycleDashboardResponse,
    dependencies=[Depends(require_permission("lifecycle.read"))],
)
async def dashboard(db: AsyncSession = Depends(get_db)):
    """Get lifecycle dashboard: users approaching archive/deletion."""
    return await get_dashboard(db)


@router.post(
    "/{user_id}/reactivate",
    response_model=ReactivateResponse,
    dependencies=[Depends(require_permission("lifecycle.manage"))],
)
async def reactivate(
    user_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Reactivate an archived user."""
    result = await reactivate_user(db, user_id, current_user.id)
    await db.commit()
    return result


@router.get(
    "/settings",
    response_model=LifecycleSettingsResponse,
    dependencies=[Depends(require_permission("lifecycle.manage"))],
)
async def settings_get():
    """Get current lifecycle settings."""
    return get_lifecycle_settings()
