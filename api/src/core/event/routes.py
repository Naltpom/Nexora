"""Event feature routes: list events and available event types."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..feature_registry import get_registry
from ..pagination import PaginatedResponse, PaginationParams
from ..permissions import load_user_permissions, require_permission
from ..security import get_current_user
from .schemas import EventListItem, EventTypeResponse
from .services import list_events

router = APIRouter()


@router.get(
    "/",
    response_model=PaginatedResponse[EventListItem],
    dependencies=[Depends(require_permission("event.read"))],
)
async def list_events_endpoint(
    pagination: PaginationParams = Depends(PaginationParams(
        default_per_page=25,
        default_sort_by="created_at",
        default_sort_dir="desc",
    )),
    event_type_filter: str = Query("", description="Filter by exact event_type"),
    show_all: bool = Query(False, description="Show events from all users (requires event.read_all)"),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List persisted events with pagination."""
    user_id = None
    if show_all:
        user_perms = await load_user_permissions(db, current_user.id)
        if user_perms.get("event.read_all") is not True:
            raise HTTPException(status_code=403, detail="Permission event.read_all requise")
    else:
        user_id = current_user.id

    rows, total, pages = await list_events(
        db,
        pagination,
        user_id=user_id,
        event_type_filter=event_type_filter,
    )

    return PaginatedResponse(
        items=[EventListItem(**row) for row in rows],
        total=total,
        page=pagination.page,
        per_page=pagination.per_page,
        pages=pages,
    )


@router.get(
    "/event-types",
    response_model=list[EventTypeResponse],
    dependencies=[Depends(require_permission("event.types"))],
)
async def list_event_types():
    """List all event types declared by active features."""
    registry = get_registry()
    if not registry:
        return []

    return [
        EventTypeResponse(
            event_type=evt["event_type"],
            label=evt["label"],
            category=evt["category"],
            description=evt.get("description"),
            feature=evt["feature"],
        )
        for evt in registry.collect_all_events()
    ]
