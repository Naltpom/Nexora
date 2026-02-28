"""Event bus subscriber: persist events and re-emit post-persist signal.

Listens to all events on the bus, persists them into the ``events`` table,
then re-emits ``event.persisted`` so downstream features (e.g. notification)
can process the persisted Event entity.
"""

import logging

from ..events import event_bus

logger = logging.getLogger(__name__)


async def _persist_and_relay(
    event_type: str,
    db=None,
    actor_id: int | None = None,
    resource_type: str | None = None,
    resource_id: int | None = None,
    payload: dict | None = None,
    **_kwargs,
) -> None:
    """Persist the event then re-emit for downstream subscribers.

    Silently skips events that don't carry the required persistence fields
    (e.g. ``event.persisted`` itself, or events emitted without resource info).
    """
    # Skip events that are not meant for persistence
    if event_type == "event.persisted":
        return
    if db is None or actor_id is None or resource_type is None or resource_id is None:
        return

    from ..feature_registry import get_registry

    registry = get_registry()
    if not registry or not registry.is_active("event"):
        return

    from .services import persist_event

    event = await persist_event(
        db,
        event_type=event_type,
        actor_id=actor_id,
        resource_type=resource_type,
        resource_id=resource_id,
        payload=payload or {},
    )

    # Re-emit so downstream features get the persisted Event object
    await event_bus.emit("event.persisted", db=db, event=event)


# Subscribe at import time (safe — just adds a reference to a list).
event_bus.subscribe("*", _persist_and_relay)
