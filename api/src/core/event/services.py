"""Event feature services: event persistence and listing."""

import math

from sqlalchemy import asc, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from .._identity.models import User
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
    *,
    user_id: int | None = None,
    search: str = "",
    event_type_filter: str = "",
    sort_by: str = "created_at",
    sort_dir: str = "desc",
    page: int = 1,
    per_page: int = 25,
) -> tuple[list[dict], int, int]:
    """List persisted events with pagination. Returns (rows, total, pages)."""
    query = select(Event, User).join(User, Event.actor_id == User.id)

    if user_id is not None:
        query = query.where(Event.actor_id == user_id)

    if event_type_filter:
        query = query.where(Event.event_type == event_type_filter)

    if search:
        search_escaped = search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        like = f"%{search_escaped}%"
        query = query.where(
            or_(
                Event.event_type.ilike(like),
                Event.resource_type.ilike(like),
                User.email.ilike(like),
            )
        )

    # Count
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    # Sorting (whitelist to prevent attribute probing)
    allowed_sort = {"created_at": Event.created_at, "event_type": Event.event_type, "resource_type": Event.resource_type}
    sort_column = allowed_sort.get(sort_by, Event.created_at)
    order = desc(sort_column) if sort_dir == "desc" else asc(sort_column)
    query = query.order_by(order)

    # Pagination
    offset = (page - 1) * per_page
    query = query.offset(offset).limit(per_page)

    result = await db.execute(query)
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

    pages = max(1, math.ceil(total / per_page))
    return rows, total, pages
