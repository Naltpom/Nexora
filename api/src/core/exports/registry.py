"""Export handler registry.

Features register async handler functions that generate export files.
The async export service looks up handlers by export_id at runtime.

Handler signature:
    async def handler(db: AsyncSession, user_id: int, params: dict) -> ExportResult

Registration (at module level in export_handlers.py):
    from src.core.exports.registry import export_registry
    export_registry.register("my_feature.xml_export", handler_fn)
"""

import logging
from dataclasses import dataclass
from typing import Any, Callable, Coroutine

from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

ExportHandlerFn = Callable[[AsyncSession, int, dict], Coroutine[Any, Any, "ExportResult"]]


@dataclass
class ExportResult:
    """Result returned by an export handler."""

    file_bytes: bytes
    filename: str
    mime_type: str
    count: int = 0


class ExportHandlerRegistry:
    """Simple registry mapping export_id strings to async handler functions."""

    def __init__(self) -> None:
        self._handlers: dict[str, ExportHandlerFn] = {}

    def register(self, export_id: str, handler: ExportHandlerFn) -> None:
        """Register a handler for the given export_id.

        Raises ValueError if the export_id is already registered (prevents
        silent overwrites that would be hard to debug).
        """
        if export_id in self._handlers:
            raise ValueError(f"Export handler already registered for '{export_id}'")
        self._handlers[export_id] = handler
        logger.info("Registered export handler: %s", export_id)

    def get(self, export_id: str) -> ExportHandlerFn | None:
        """Return the handler for *export_id*, or ``None``."""
        return self._handlers.get(export_id)

    def list_ids(self) -> list[str]:
        """Return all registered export_id values."""
        return list(self._handlers.keys())


# Singleton instance
export_registry = ExportHandlerRegistry()
