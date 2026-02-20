"""Event feature services: event persistence."""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

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
        redirect_token=str(uuid.uuid4()),
    )
    db.add(event)
    await db.flush()
    return event
