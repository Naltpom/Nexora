"""Event bus subscriber for the notification feature.

Listens to ``event.persisted`` (emitted by the event feature after
persisting an Event row) and runs the notification rules engine.
"""

import logging

from ...core.events import event_bus

logger = logging.getLogger(__name__)


async def _on_persisted_event(db, event, **_kwargs) -> None:
    """Process a persisted event through the notification rules engine."""
    from ...core.feature_registry import get_registry

    registry = get_registry()
    if not registry or not registry.is_active("notification"):
        return

    from .services import process_notifications

    await process_notifications(db, event)


# Subscribe to post-persist events (emitted by the event feature).
event_bus.subscribe("event.persisted", _on_persisted_event)
