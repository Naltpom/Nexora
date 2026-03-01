"""File storage admin routes."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..events import event_bus
from ..pagination import PaginatedResponse, PaginationParams
from ..permissions import require_permission
from ..security import get_current_user
from .schemas import (
    AdminStatsResponse,
    FileStoragePolicyResponse,
    FileStoragePolicyUpdate,
    StorageDocumentAdminResponse,
)
from .services import (
    approve_document,
    delete_policy,
    get_admin_stats,
    get_document_by_uuid,
    hard_delete_document,
    list_all_files_admin,
    list_moderation_queue,
    list_policies,
    reject_document,
    upsert_policy,
)

router = APIRouter()


# -- Admin: files -------------------------------------------------------------


@router.get(
    "/files",
    response_model=PaginatedResponse[StorageDocumentAdminResponse],
    dependencies=[Depends(require_permission("file_storage.admin"))],
)
async def admin_list_files(
    mime_filter: str | None = Query(None, alias="filter"),
    status_filter: str | None = Query(None, alias="status"),
    pagination: PaginationParams = Depends(PaginationParams(
        default_per_page=20,
        default_sort_by="created_at",
        default_sort_dir="desc",
    )),
    db: AsyncSession = Depends(get_db),
):
    """Admin: list all files with search, filter, and status."""
    rows, total, pages = await list_all_files_admin(db, pagination, mime_filter, status_filter)
    items = [StorageDocumentAdminResponse(**row) for row in rows]
    return PaginatedResponse(
        items=items, total=total, page=pagination.page, per_page=pagination.per_page, pages=pages,
    )


@router.get(
    "/stats",
    response_model=AdminStatsResponse,
    dependencies=[Depends(require_permission("file_storage.admin"))],
)
async def admin_stats(
    db: AsyncSession = Depends(get_db),
):
    """Admin: get global file storage statistics."""
    stats = await get_admin_stats(db)
    return AdminStatsResponse(**stats)


@router.delete(
    "/files/{doc_uuid}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("file_storage.admin"))],
)
async def admin_delete_file(
    doc_uuid: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin: hard-delete any file."""
    doc = await get_document_by_uuid(db, doc_uuid, include_deleted=True)
    if not doc:
        raise HTTPException(status_code=404, detail="Fichier introuvable")

    filename = doc.original_filename
    doc_id = doc.id

    await hard_delete_document(db, doc)

    await event_bus.emit(
        "file_storage.deleted",
        db=db,
        actor_id=current_user.id,
        resource_type="storage_document",
        resource_id=doc_id,
        payload={
            "actor_name": f"{current_user.first_name} {current_user.last_name}",
            "filename": filename,
            "admin_action": True,
        },
    )


# -- Moderation ---------------------------------------------------------------


@router.get(
    "/moderation",
    response_model=PaginatedResponse[StorageDocumentAdminResponse],
    dependencies=[Depends(require_permission("file_storage.moderate"))],
)
async def moderation_queue(
    status_filter: str | None = Query(None, alias="status"),
    pagination: PaginationParams = Depends(PaginationParams(
        default_per_page=20,
        default_sort_by="created_at",
        default_sort_dir="desc",
    )),
    db: AsyncSession = Depends(get_db),
):
    """List files in the moderation queue."""
    rows, total, pages = await list_moderation_queue(db, pagination, status_filter)
    items = [StorageDocumentAdminResponse(**row) for row in rows]
    return PaginatedResponse(
        items=items, total=total, page=pagination.page, per_page=pagination.per_page, pages=pages,
    )


@router.patch(
    "/files/{doc_uuid}/approve",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("file_storage.moderate"))],
)
async def approve_file(
    doc_uuid: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Approve a pending file."""
    doc = await get_document_by_uuid(db, doc_uuid)
    if not doc:
        raise HTTPException(status_code=404, detail="Fichier introuvable")

    await approve_document(db, doc, current_user.id)

    await event_bus.emit(
        "file_storage.approved",
        db=db,
        actor_id=current_user.id,
        resource_type="storage_document",
        resource_id=doc.id,
        payload={
            "actor_name": f"{current_user.first_name} {current_user.last_name}",
            "filename": doc.original_filename,
        },
    )


@router.patch(
    "/files/{doc_uuid}/reject",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("file_storage.moderate"))],
)
async def reject_file(
    doc_uuid: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Reject a pending file."""
    doc = await get_document_by_uuid(db, doc_uuid)
    if not doc:
        raise HTTPException(status_code=404, detail="Fichier introuvable")

    await reject_document(db, doc, current_user.id)

    await event_bus.emit(
        "file_storage.rejected",
        db=db,
        actor_id=current_user.id,
        resource_type="storage_document",
        resource_id=doc.id,
        payload={
            "actor_name": f"{current_user.first_name} {current_user.last_name}",
            "filename": doc.original_filename,
        },
    )


# -- Policies -----------------------------------------------------------------


@router.get(
    "/policies",
    response_model=list[FileStoragePolicyResponse],
    dependencies=[Depends(require_permission("file_storage.policies"))],
)
async def get_policies(
    db: AsyncSession = Depends(get_db),
):
    """List all file storage moderation policies."""
    policies = await list_policies(db)
    return [FileStoragePolicyResponse(**p) for p in policies]


@router.put(
    "/policies/{resource_type}",
    response_model=FileStoragePolicyResponse,
    dependencies=[Depends(require_permission("file_storage.policies"))],
)
async def put_policy(
    resource_type: str,
    body: FileStoragePolicyUpdate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create or update a moderation policy for a resource type."""
    policy = await upsert_policy(db, resource_type, body.requires_moderation, current_user.id)

    event_type = "file_storage.policy_updated"
    await event_bus.emit(
        event_type,
        db=db,
        actor_id=current_user.id,
        resource_type="file_storage_policy",
        resource_id=None,
        payload={
            "actor_name": f"{current_user.first_name} {current_user.last_name}",
            "policy_resource_type": resource_type,
            "requires_moderation": body.requires_moderation,
        },
    )

    return FileStoragePolicyResponse(
        resource_type=policy.resource_type,
        requires_moderation=policy.requires_moderation,
        updated_at=policy.updated_at,
        updated_by_id=policy.updated_by_id,
    )


@router.delete(
    "/policies/{resource_type}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("file_storage.policies"))],
)
async def remove_policy(
    resource_type: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a moderation policy."""
    deleted = await delete_policy(db, resource_type)
    if not deleted:
        raise HTTPException(status_code=404, detail="Policy introuvable")

    await event_bus.emit(
        "file_storage.policy_deleted",
        db=db,
        actor_id=current_user.id,
        resource_type="file_storage_policy",
        resource_id=None,
        payload={
            "actor_name": f"{current_user.first_name} {current_user.last_name}",
            "policy_resource_type": resource_type,
        },
    )
