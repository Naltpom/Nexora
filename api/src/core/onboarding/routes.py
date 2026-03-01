from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..events import event_bus
from ..permissions import require_permission
from ..security import get_current_user

router = APIRouter()


@router.post(
    "/complete",
    status_code=204,
    dependencies=[Depends(require_permission("onboarding.read"))],
)
async def complete_onboarding(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await event_bus.emit(
        "onboarding.completed",
        db=db,
        actor_id=current_user.id,
        resource_type="onboarding",
        resource_id=current_user.id,
        payload={
            "actor_name": f"{current_user.first_name} {current_user.last_name}",
        },
    )


@router.post(
    "/skip",
    status_code=204,
    dependencies=[Depends(require_permission("onboarding.read"))],
)
async def skip_onboarding(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await event_bus.emit(
        "onboarding.skipped",
        db=db,
        actor_id=current_user.id,
        resource_type="onboarding",
        resource_id=current_user.id,
        payload={
            "actor_name": f"{current_user.first_name} {current_user.last_name}",
        },
    )
