"""Event feature routes: list events and available event types."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..feature_registry import get_registry
from ..permissions import load_user_permissions, require_permission
from ..security import get_current_user
from .schemas import EventListItem, EventListPaginatedResponse, EventTypeResponse
from .services import list_events

router = APIRouter()


@router.get(
    "/",
    response_model=EventListPaginatedResponse,
    dependencies=[Depends(require_permission("event.read"))],
)
async def list_events_endpoint(
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    search: str = Query("", description="Search event_type, resource_type, actor email"),
    event_type_filter: str = Query("", description="Filter by exact event_type"),
    sort_by: str = Query("created_at", description="Sort field: created_at, event_type, resource_type"),
    sort_dir: str = Query("desc", description="Sort direction: asc or desc"),
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
        user_id=user_id,
        search=search,
        event_type_filter=event_type_filter,
        sort_by=sort_by,
        sort_dir=sort_dir,
        page=page,
        per_page=per_page,
    )

    return EventListPaginatedResponse(
        items=[EventListItem(**row) for row in rows],
        total=total,
        page=page,
        per_page=per_page,
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
