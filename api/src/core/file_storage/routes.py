"""File storage feature routes."""

from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .._identity.models import User
from ..database import get_db
from ..events import event_bus
from ..pagination import PaginatedResponse, PaginationParams
from ..permissions import require_permission
from ..security import get_current_user
from .schemas import QuotaResponse, StorageDocumentResponse, UploadMultipleResponse, UploadResponse
from .services import (
    get_document_by_uuid,
    get_user_quota,
    list_user_files,
    soft_delete_document,
    upload_file,
)
from .storage import get_storage_backend
from .thumbnails import get_thumbnail_path

router = APIRouter()


def _doc_response(doc, user=None, current_user=None) -> StorageDocumentResponse:
    """Build a StorageDocumentResponse from a StorageDocument model."""
    uname = None
    if user:
        uname = f"{user.first_name} {user.last_name}"
    elif current_user:
        uname = f"{current_user.first_name} {current_user.last_name}"
    return StorageDocumentResponse(
        id=doc.id,
        uuid=doc.uuid,
        original_filename=doc.original_filename,
        mime_type=doc.mime_type,
        extension=doc.extension,
        size_bytes=doc.size_bytes,
        category=doc.category,
        resource_type=doc.resource_type,
        resource_id=doc.resource_id,
        has_thumbnail=doc.has_thumbnail,
        is_public=doc.is_public,
        scan_status=doc.scan_status,
        scan_result=doc.scan_result,
        status=doc.status,
        moderated_by_id=doc.moderated_by_id,
        moderated_at=doc.moderated_at,
        uploaded_by=doc.uploaded_by,
        uploader_name=uname,
        created_at=doc.created_at,
    )


# -- Upload -------------------------------------------------------------------


@router.post(
    "/upload",
    response_model=UploadResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("file_storage.upload"))],
)
async def upload_single(
    file: UploadFile = File(...),
    resource_type: Annotated[str, Form()] = "general",
    resource_id: Annotated[int | None, Form()] = None,
    category: Annotated[str, Form()] = "document",
    is_public: Annotated[bool, Form()] = False,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a single file."""
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Fichier vide")

    try:
        doc = await upload_file(
            db=db,
            file_data=content,
            filename=file.filename or "file",
            mime_type=file.content_type or "application/octet-stream",
            user_id=current_user.id,
            resource_type=resource_type,
            resource_id=resource_id,
            category=category,
            is_public=is_public,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    await event_bus.emit(
        "file_storage.uploaded",
        db=db,
        actor_id=current_user.id,
        resource_type="storage_document",
        resource_id=doc.id,
        payload={
            "actor_name": f"{current_user.first_name} {current_user.last_name}",
            "filename": doc.original_filename,
            "size_bytes": doc.size_bytes,
        },
    )

    return UploadResponse(file=_doc_response(doc, current_user=current_user))


@router.post(
    "/upload-multiple",
    response_model=UploadMultipleResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("file_storage.upload"))],
)
async def upload_multiple(
    files: list[UploadFile] = File(...),
    resource_type: Annotated[str, Form()] = "general",
    resource_id: Annotated[int | None, Form()] = None,
    category: Annotated[str, Form()] = "document",
    is_public: Annotated[bool, Form()] = False,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload multiple files at once."""
    uploaded = []
    errors = []

    for f in files:
        content = await f.read()
        if not content:
            errors.append(f"Fichier vide : {f.filename}")
            continue

        try:
            doc = await upload_file(
                db=db,
                file_data=content,
                filename=f.filename or "file",
                mime_type=f.content_type or "application/octet-stream",
                user_id=current_user.id,
                resource_type=resource_type,
                resource_id=resource_id,
                category=category,
                is_public=is_public,
            )
            uploaded.append(_doc_response(doc, current_user=current_user))
        except ValueError as e:
            errors.append(f"{f.filename}: {str(e)}")

    if uploaded:
        await event_bus.emit(
            "file_storage.uploaded",
            db=db,
            actor_id=current_user.id,
            resource_type="storage_document",
            resource_id=uploaded[0].id,
            payload={
                "actor_name": f"{current_user.first_name} {current_user.last_name}",
                "count": len(uploaded),
            },
        )

    return UploadMultipleResponse(files=uploaded, errors=errors)


# -- Read / Download ----------------------------------------------------------


@router.get(
    "/files",
    response_model=PaginatedResponse[StorageDocumentResponse],
    dependencies=[Depends(require_permission("file_storage.read"))],
)
async def list_files(
    resource_type: str | None = Query(None),
    resource_id: int | None = Query(None),
    pagination: PaginationParams = Depends(PaginationParams(
        default_per_page=20,
        default_sort_by="created_at",
        default_sort_dir="desc",
    )),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List current user's files, optionally filtered by resource."""
    rows, total, pages = await list_user_files(
        db, current_user.id, pagination, resource_type, resource_id,
    )
    items = [StorageDocumentResponse(**row) for row in rows]
    return PaginatedResponse(
        items=items, total=total, page=pagination.page, per_page=pagination.per_page, pages=pages,
    )


@router.get(
    "/files/{doc_uuid}",
    response_model=StorageDocumentResponse,
    dependencies=[Depends(require_permission("file_storage.read"))],
)
async def get_file_metadata(
    doc_uuid: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get file metadata by UUID."""
    doc = await get_document_by_uuid(db, doc_uuid)
    if not doc:
        raise HTTPException(status_code=404, detail="Fichier introuvable")

    # Non-public files: only owner or admin can view
    if not doc.is_public and doc.uploaded_by != current_user.id:
        raise HTTPException(status_code=404, detail="Fichier introuvable")

    user = await db.scalar(select(User).where(User.id == doc.uploaded_by)) if doc.uploaded_by else None

    return _doc_response(doc, user=user)


@router.get(
    "/files/{doc_uuid}/download",
    dependencies=[Depends(require_permission("file_storage.read"))],
)
async def download_file(
    doc_uuid: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Download a file by UUID."""
    doc = await get_document_by_uuid(db, doc_uuid)
    if not doc:
        raise HTTPException(status_code=404, detail="Fichier introuvable")

    if not doc.is_public and doc.uploaded_by != current_user.id:
        raise HTTPException(status_code=404, detail="Fichier introuvable")

    storage = get_storage_backend()
    if not await storage.exists(doc.storage_path):
        raise HTTPException(status_code=404, detail="Fichier absent du stockage")

    file_data = await storage.read(doc.storage_path)
    return Response(
        content=file_data,
        media_type=doc.mime_type,
        headers={
            "Content-Disposition": f'attachment; filename="{doc.original_filename}"',
            "Content-Length": str(doc.size_bytes),
        },
    )


@router.get(
    "/files/{doc_uuid}/thumbnail",
    dependencies=[Depends(require_permission("file_storage.read"))],
)
async def get_thumbnail(
    doc_uuid: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get thumbnail for an image file."""
    doc = await get_document_by_uuid(db, doc_uuid)
    if not doc:
        raise HTTPException(status_code=404, detail="Fichier introuvable")

    if not doc.is_public and doc.uploaded_by != current_user.id:
        raise HTTPException(status_code=404, detail="Fichier introuvable")

    if not doc.has_thumbnail:
        raise HTTPException(status_code=404, detail="Pas de thumbnail disponible")

    thumb_path = await get_thumbnail_path(doc.storage_path)
    if not thumb_path:
        raise HTTPException(status_code=404, detail="Thumbnail absent du stockage")

    storage = get_storage_backend()
    thumb_data = await storage.read(thumb_path)
    return Response(
        content=thumb_data,
        media_type="image/jpeg",
        headers={"Cache-Control": "public, max-age=86400"},
    )


# -- Delete -------------------------------------------------------------------


@router.delete(
    "/files/{doc_uuid}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("file_storage.delete"))],
)
async def delete_file(
    doc_uuid: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete a file (owner only)."""
    doc = await get_document_by_uuid(db, doc_uuid, user_id=current_user.id)
    if not doc:
        raise HTTPException(status_code=404, detail="Fichier introuvable")

    await soft_delete_document(db, doc)

    await event_bus.emit(
        "file_storage.deleted",
        db=db,
        actor_id=current_user.id,
        resource_type="storage_document",
        resource_id=doc.id,
        payload={
            "actor_name": f"{current_user.first_name} {current_user.last_name}",
            "filename": doc.original_filename,
        },
    )


# -- Quota --------------------------------------------------------------------


@router.get(
    "/quota",
    response_model=QuotaResponse,
    dependencies=[Depends(require_permission("file_storage.read"))],
)
async def get_quota(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user's storage quota usage."""
    quota = await get_user_quota(db, current_user.id)
    return QuotaResponse(**quota)
