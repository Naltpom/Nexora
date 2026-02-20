"""Event feature routes: list available event types."""

from fastapi import APIRouter, Depends

from ...core.feature_registry import get_registry
from ...core.security import get_current_user
from .schemas import EventTypeResponse

router = APIRouter()


@router.get("/event-types", response_model=list[EventTypeResponse])
async def list_event_types(
    current_user=Depends(get_current_user),
):
    """List all event types declared by active features."""
    registry = get_registry()
    if not registry:
        return []

    result = []
    for evt in registry.collect_all_events():
        admin_only = evt.get("admin_only", False)
        if admin_only and not current_user.is_super_admin:
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
