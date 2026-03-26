"""Export history feature routes."""

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from ..database import get_db
from ..file_storage.services import soft_delete_document, upload_file
from ..pagination import PaginatedResponse, PaginationParams, paginate
from ..permissions import require_permission
from ..security import get_current_user
from .models import ExportHistory
from .schemas import ExportHistoryResponse, ExportStatusResponse, GenerateExportRequest

router = APIRouter()


# -- Helpers ------------------------------------------------------------------


FORMAT_MIME_TYPES = {
    "xml": "application/xml",
    "excel": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "csv": "text/csv",
    "json": "application/json",
    "pdf": "application/pdf",
}


def _history_response(entry: ExportHistory) -> ExportHistoryResponse:
    """Build an ExportHistoryResponse from an ExportHistory model instance."""
    storage_doc_uuid = None
    if entry.storage_document and entry.storage_document.deleted_at is None:
        storage_doc_uuid = entry.storage_document.uuid

    user_name = None
    if entry.user:
        user_name = f"{entry.user.first_name} {entry.user.last_name}"

    return ExportHistoryResponse(
        id=entry.id,
        uuid=entry.uuid,
        export_id=entry.export_id,
        export_label=entry.export_label,
        feature_name=entry.feature_name,
        format=entry.format,
        params_json=entry.params_json,
        params_display=entry.params_display,
        oc_id=entry.oc_id,
        oc_name=entry.oc_name,
        file_size_bytes=entry.file_size_bytes,
        status=entry.status,
        error_detail=entry.error_detail,
        storage_document_uuid=storage_doc_uuid,
        user_name=user_name,
        created_at=entry.created_at,
    )


# -- Create -------------------------------------------------------------------


@router.post(
    "/history",
    response_model=ExportHistoryResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("exports.read"))],
)
async def save_export_history(
    file: UploadFile = File(...),
    export_id: str = Form(...),
    export_label: str = Form(...),
    feature_name: str = Form(...),
    format: str = Form(...),
    params_json: str | None = Form(None),
    params_display: str | None = Form(None),
    oc_id: int | None = Form(None),
    oc_name: str | None = Form(None),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Save an export file to history."""
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Fichier vide")

    # Determine MIME type from format
    mime_type = FORMAT_MIME_TYPES.get(format, file.content_type or "application/octet-stream")

    # Upload file via file_storage service
    try:
        doc = await upload_file(
            db=db,
            file_data=content,
            filename=file.filename or f"export.{format}",
            mime_type=mime_type,
            user_id=current_user.id,
            resource_type="export",
            category="export",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Create export history record
    entry = ExportHistory(
        user_id=current_user.id,
        export_id=export_id,
        export_label=export_label,
        feature_name=feature_name,
        format=format,
        params_json=params_json,
        params_display=params_display,
        oc_id=oc_id,
        oc_name=oc_name,
        storage_document_id=doc.id,
        file_size_bytes=doc.size_bytes,
        status="success",
    )
    db.add(entry)
    await db.flush()

    # Reload with relationships for response
    result = await db.execute(
        select(ExportHistory)
        .options(joinedload(ExportHistory.user), joinedload(ExportHistory.storage_document))
        .where(ExportHistory.id == entry.id)
    )
    entry = result.scalar_one()

    return _history_response(entry)


# -- List ---------------------------------------------------------------------


@router.get(
    "/history",
    response_model=PaginatedResponse[ExportHistoryResponse],
    dependencies=[Depends(require_permission("exports.read"))],
)
async def list_export_history(
    pagination: PaginationParams = Depends(PaginationParams(
        default_per_page=20,
        default_sort_by="created_at",
        default_sort_dir="desc",
    )),
    export_id: str | None = Query(None, description="Filter by export_id"),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List current user's export history (paginated)."""
    query = (
        select(ExportHistory)
        .options(joinedload(ExportHistory.user), joinedload(ExportHistory.storage_document))
        .where(ExportHistory.user_id == current_user.id)
    )

    if export_id:
        query = query.where(ExportHistory.export_id == export_id)

    sort_whitelist = {
        "created_at": ExportHistory.created_at,
        "export_label": ExportHistory.export_label,
        "format": ExportHistory.format,
        "feature_name": ExportHistory.feature_name,
    }

    result, total, pages = await paginate(
        db, query, pagination,
        sort_whitelist=sort_whitelist,
        default_sort_column=ExportHistory.created_at,
    )

    items = [_history_response(entry) for entry in result.unique().scalars().all()]

    return PaginatedResponse(
        items=items,
        total=total,
        page=pagination.page,
        per_page=pagination.per_page,
        pages=pages,
    )


# -- Delete -------------------------------------------------------------------


@router.delete(
    "/history/{uuid}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("exports.read"))],
)
async def delete_export_history(
    uuid: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an export history entry (own entries only)."""
    result = await db.execute(
        select(ExportHistory)
        .options(joinedload(ExportHistory.storage_document))
        .where(
            ExportHistory.uuid == uuid,
            ExportHistory.user_id == current_user.id,
        )
    )
    entry = result.unique().scalar_one_or_none()

    if not entry:
        raise HTTPException(status_code=404, detail="Enregistrement introuvable")

    # Soft-delete the linked storage document if it exists
    if entry.storage_document and entry.storage_document.deleted_at is None:
        await soft_delete_document(db, entry.storage_document)

    # Hard-delete the history record
    await db.delete(entry)
    await db.flush()


# -- Generate (async) --------------------------------------------------------


@router.post(
    "/generate",
    response_model=ExportHistoryResponse,
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(require_permission("exports.read"))],
)
async def generate_export(
    body: GenerateExportRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Launch async export generation.

    Returns immediately with a pending ExportHistory entry (status='pending').
    The file is generated in the background. Use ``GET /status/{uuid}`` to
    poll for completion, or wait for the ``exports.ready`` event/notification.
    """
    from .services import launch_export

    try:
        entry = await launch_export(
            db=db,
            user_id=current_user.id,
            export_id=body.export_id,
            export_label=body.export_label,
            feature_name=body.feature_name,
            format=body.format,
            params_json=body.params_json,
            params_display=body.params_display,
            oc_id=body.oc_id,
            oc_name=body.oc_name,
            permission=body.permission,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return _history_response(entry)


# -- Status -------------------------------------------------------------------


@router.get(
    "/status/{uuid}",
    response_model=ExportStatusResponse,
    dependencies=[Depends(require_permission("exports.read"))],
)
async def get_export_status(
    uuid: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Check the status of an export (own entries only)."""
    result = await db.execute(
        select(ExportHistory)
        .options(joinedload(ExportHistory.storage_document))
        .where(
            ExportHistory.uuid == uuid,
            ExportHistory.user_id == current_user.id,
        )
    )
    entry = result.unique().scalar_one_or_none()

    if not entry:
        raise HTTPException(status_code=404, detail="Export introuvable")

    storage_doc_uuid = None
    if entry.storage_document and entry.storage_document.deleted_at is None:
        storage_doc_uuid = entry.storage_document.uuid

    return ExportStatusResponse(
        uuid=entry.uuid,
        status=entry.status,
        error_detail=entry.error_detail,
        storage_document_uuid=storage_doc_uuid,
        file_size_bytes=entry.file_size_bytes,
    )
