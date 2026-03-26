"""Async export service.

Launches export generation as a background ``asyncio.Task``.
The request handler returns immediately with a pending ExportHistory entry;
the background task generates the file, uploads it to storage, and updates
the history entry to success/error.
"""

import asyncio
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from ..database import async_session
from ..events import event_bus
from ..file_storage.services import upload_file
from .models import ExportHistory
from .registry import export_registry

logger = logging.getLogger(__name__)

# Keep references to running tasks so the GC doesn't collect them.
_running_tasks: set[asyncio.Task] = set()


async def launch_export(
    db: AsyncSession,
    user_id: int,
    export_id: str,
    export_label: str,
    feature_name: str,
    format: str,
    params_json: str | None,
    params_display: str | None,
    oc_id: int | None,
    oc_name: str | None,
    permission: str,
) -> ExportHistory:
    """Create a pending ExportHistory row and launch background generation.

    Returns the ExportHistory entry immediately (status='pending').
    """
    # Validate that a handler exists before creating the entry
    handler = export_registry.get(export_id)
    if handler is None:
        raise ValueError(f"Aucun handler d'export enregistre pour '{export_id}'")

    entry = ExportHistory(
        user_id=user_id,
        export_id=export_id,
        export_label=export_label,
        feature_name=feature_name,
        format=format,
        params_json=params_json,
        params_display=params_display,
        oc_id=oc_id,
        oc_name=oc_name,
        status="pending",
    )
    db.add(entry)
    await db.flush()

    # Snapshot the ID and params before the request session closes
    entry_id = entry.id
    entry_uuid = entry.uuid

    # Reload with relationships for the response
    result = await db.execute(
        select(ExportHistory)
        .options(joinedload(ExportHistory.user), joinedload(ExportHistory.storage_document))
        .where(ExportHistory.id == entry_id)
    )
    entry = result.scalar_one()

    # Launch background task with its own DB session
    task = asyncio.create_task(
        _process_export(
            entry_id=entry_id,
            entry_uuid=entry_uuid,
            export_id=export_id,
            export_label=export_label,
            feature_name=feature_name,
            format=format,
            params_json=params_json,
            user_id=user_id,
            permission=permission,
        )
    )
    _running_tasks.add(task)
    task.add_done_callback(_running_tasks.discard)

    return entry


async def _process_export(
    entry_id: int,
    entry_uuid: str,
    export_id: str,
    export_label: str,
    feature_name: str,
    format: str,
    params_json: str | None,
    user_id: int,
    permission: str,
) -> None:
    """Background task: generate file, upload, update history, emit event."""
    import json

    handler = export_registry.get(export_id)
    if handler is None:
        logger.error("Export handler '%s' disappeared after launch (entry %s)", export_id, entry_id)
        await _mark_error(entry_id, f"Handler '{export_id}' introuvable")
        return

    params = {}
    if params_json:
        try:
            params = json.loads(params_json)
        except json.JSONDecodeError:
            await _mark_error(entry_id, "Parametres JSON invalides")
            return

    try:
        async with async_session() as db:
            try:
                # 1. Call handler
                result = await handler(db, user_id, params)

                # 2. Upload file to storage
                doc = await upload_file(
                    db=db,
                    file_data=result.file_bytes,
                    filename=result.filename,
                    mime_type=result.mime_type,
                    user_id=user_id,
                    resource_type="export",
                    category="export",
                )

                # 3. Update ExportHistory → success
                entry_result = await db.execute(
                    select(ExportHistory).where(ExportHistory.id == entry_id)
                )
                entry = entry_result.scalar_one()
                entry.status = "success"
                entry.storage_document_id = doc.id
                entry.file_size_bytes = doc.size_bytes

                await db.flush()

                # 4. Emit event for notification system
                await event_bus.emit(
                    "exports.ready",
                    db=db,
                    actor_id=user_id,
                    resource_type="export_history",
                    resource_id=entry.id,
                    payload={
                        "entry_uuid": entry_uuid,
                        "export_id": export_id,
                        "export_label": export_label,
                        "feature_name": feature_name,
                        "format": format,
                        "count": result.count,
                        "permission": permission,
                        "target_user_id": user_id,
                    },
                )

                await db.commit()
                logger.info(
                    "Export '%s' (entry %s) completed: %d items, %d bytes",
                    export_id, entry_id, result.count, doc.size_bytes,
                )

            except Exception:
                await db.rollback()
                raise

    except Exception as exc:
        logger.exception("Export '%s' (entry %s) failed", export_id, entry_id)
        error_detail = f"{type(exc).__name__}: {exc}"
        # Truncate very long error messages
        if len(error_detail) > 2000:
            error_detail = error_detail[:2000] + "..."
        await _mark_error(entry_id, error_detail)


async def _mark_error(entry_id: int, error_detail: str) -> None:
    """Update an ExportHistory entry to error status using a fresh session."""
    try:
        async with async_session() as db:
            entry_result = await db.execute(
                select(ExportHistory).where(ExportHistory.id == entry_id)
            )
            entry = entry_result.scalar_one_or_none()
            if entry:
                entry.status = "error"
                entry.error_detail = error_detail
                await db.commit()
            else:
                logger.error("ExportHistory entry %s not found when marking error", entry_id)
    except Exception:
        logger.exception("Failed to mark export entry %s as error", entry_id)
