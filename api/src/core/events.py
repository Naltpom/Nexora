"""Lightweight async event bus.

Features can subscribe to events emitted by any part of the application.
This keeps feature modules decoupled: core emits events without knowing
who listens, and features subscribe without modifying core code.

Usage (emitter side — e.g. core routes):

    from ..events import event_bus
    await event_bus.emit("user.registered", db=db, actor_id=user.id, ...)

Usage (subscriber side — e.g. notification feature manifest / startup):

    from ..events import event_bus
    event_bus.subscribe("user.registered", my_handler)
    # or subscribe to all events:
    event_bus.subscribe("*", my_handler)
"""

import logging
from typing import Any, Callable, Coroutine

logger = logging.getLogger(__name__)

EventHandler = Callable[..., Coroutine[Any, Any, None]]


class EventBus:
    """Simple in-process async event bus."""

    def __init__(self) -> None:
        self._handlers: dict[str, list[EventHandler]] = {}

    def subscribe(self, event_type: str, handler: EventHandler) -> None:
        """Register *handler* to be called when *event_type* is emitted.

        Use ``"*"`` as *event_type* to receive every event (the handler
        will receive an extra ``event_type`` keyword argument).
        """
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        if handler not in self._handlers[event_type]:
            self._handlers[event_type].append(handler)

    def unsubscribe(self, event_type: str, handler: EventHandler) -> None:
        """Remove a previously registered handler."""
        if event_type in self._handlers:
            try:
                self._handlers[event_type].remove(handler)
            except ValueError:
                pass

    async def emit(self, event_type: str, **kwargs: Any) -> None:
        """Emit an event. All matching handlers are called sequentially.

        Errors in handlers are logged but never propagated so that a
        failing subscriber cannot break the emitter.
        """
        # Specific handlers
        for handler in self._handlers.get(event_type, []):
            try:
                await handler(**kwargs)
            except Exception:
                logger.exception(
                    "Event handler %s failed for event %s",
                    handler.__qualname__,
                    event_type,
                )

        # Wildcard handlers
        for handler in self._handlers.get("*", []):
            try:
                await handler(event_type=event_type, **kwargs)
            except Exception:
                logger.exception(
                    "Wildcard event handler %s failed for event %s",
                    handler.__qualname__,
                    event_type,
                )


# Singleton instance — import this from anywhere.
event_bus = EventBus()
