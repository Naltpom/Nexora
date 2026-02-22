"""Event feature routes: list available event types."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..feature_registry import get_registry
from ..permissions import load_user_permissions, require_permission
from ..security import get_current_user
from .schemas import EventTypeResponse

router = APIRouter()


@router.get(
    "/event-types",
    response_model=list[EventTypeResponse],
    dependencies=[Depends(require_permission("event.read"))],
)
async def list_event_types(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all event types declared by active features."""
    registry = get_registry()
    if not registry:
        return []

    user_perms = await load_user_permissions(db, current_user.id)
    is_admin = user_perms.get("notification.admin") is True

    result = []
    for evt in registry.collect_all_events():
        admin_only = evt.get("admin_only", False)
        if admin_only and not is_admin:
            continue
        result.append(EventTypeResponse(
            event_type=evt["event_type"],
            label=evt["label"],
            category=evt["category"],
            description=evt.get("description"),
            admin_only=admin_only,
            feature=evt["feature"],
        ))
    return result
