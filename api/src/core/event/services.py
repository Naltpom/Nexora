"""Event feature services: event persistence and listing."""

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from .._identity.models import User
from ..pagination import PaginationParams, paginate, search_like_pattern
from .models import Event


async def persist_event(
    db: AsyncSession,
    event_type: str,
    actor_id: int,
    resource_type: str,
    resource_id: int,
    payload: dict,
) -> Event:
    """Create and persist an Event row."""
    event = Event(
        event_type=event_type,
        actor_id=actor_id,
        resource_type=resource_type,
        resource_id=resource_id,
        payload=payload,
    )
    db.add(event)
    await db.flush()
    return event


async def list_events(
    db: AsyncSession,
    pagination: PaginationParams,
    *,
    user_id: int | None = None,
    event_type_filter: str = "",
) -> tuple[list[dict], int, int]:
    """List persisted events with pagination. Returns (rows, total, pages)."""
    query = select(Event, User).join(User, Event.actor_id == User.id)

    if user_id is not None:
        query = query.where(Event.actor_id == user_id)

    if event_type_filter:
        query = query.where(Event.event_type == event_type_filter)

    if pagination.search:
        like = search_like_pattern(pagination.search)
        query = query.where(
            or_(
                Event.event_type.ilike(like),
                Event.resource_type.ilike(like),
                User.email.ilike(like),
            )
        )

    sort_whitelist = {
        "created_at": Event.created_at,
        "event_type": Event.event_type,
        "resource_type": Event.resource_type,
    }
    result, total, pages = await paginate(
        db, query, pagination,
        sort_whitelist=sort_whitelist,
        default_sort_column=Event.created_at,
    )

    rows = []
    for event, user in result.all():
        rows.append({
            "id": event.id,
            "event_type": event.event_type,
            "actor_id": event.actor_id,
            "actor_email": user.email,
            "resource_type": event.resource_type,
            "resource_id": event.resource_id,
            "payload": event.payload,
            "created_at": event.created_at,
        })

    return rows, total, pages
