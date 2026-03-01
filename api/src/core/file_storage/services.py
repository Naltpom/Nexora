"""File storage feature business logic."""

from __future__ import annotations

import hashlib
import os
import uuid as uuid_mod
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from .antivirus import scan_file
from .models import FileStoragePolicy, StorageDocument
from .storage import get_storage_backend
from .thumbnails import can_generate_thumbnail, generate_thumbnail

if TYPE_CHECKING:
    from ..pagination import PaginationParams


# -- Upload -------------------------------------------------------------------


async def upload_file(
    db: AsyncSession,
    file_data: bytes,
    filename: str,
    mime_type: str,
    user_id: int,
    resource_type: str = "general",
    resource_id: int | None = None,
    category: str = "document",
    is_public: bool = False,
) -> StorageDocument:
    """Upload a file: validate, scan, store, create DB record."""
    # Size check
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(file_data) > max_bytes:
        raise ValueError(f"Fichier trop volumineux (max {settings.MAX_UPLOAD_SIZE_MB} Mo)")

    # Quota check
    if settings.UPLOAD_QUOTA_MB > 0:
        used = await get_user_usage_bytes(db, user_id)
        quota_bytes = settings.UPLOAD_QUOTA_MB * 1024 * 1024
        if used + len(file_data) > quota_bytes:
            raise ValueError("Quota de stockage depasse")

    # Antivirus scan
    scan_status, scan_result = await scan_file(file_data)
    if scan_status == "infected":
        raise ValueError(f"Fichier infecte : {scan_result}")

    # Generate stored filename with structured path
    now = datetime.now(timezone.utc)
    ext = os.path.splitext(filename)[1].lower() or ""
    stored_filename = f"{uuid_mod.uuid4().hex}{ext}"
    storage_path = f"{resource_type}/{now.year}/{now.month:02d}/{stored_filename}"

    # Checksum
    checksum = hashlib.sha256(file_data).hexdigest()

    # Store file
    storage = get_storage_backend()
    await storage.save(file_data, storage_path)

    # Generate thumbnail for images
    has_thumb = False
    if can_generate_thumbnail(mime_type):
        has_thumb = await generate_thumbnail(file_data, storage_path, mime_type)

    # Check moderation policy
    policy = await db.get(FileStoragePolicy, resource_type)
    doc_status = "pending" if (policy and policy.requires_moderation) else "approved"

    # Create DB record
    doc = StorageDocument(
        original_filename=filename[:255],
        stored_filename=stored_filename,
        mime_type=mime_type,
        extension=ext[:20],
        size_bytes=len(file_data),
        storage_backend=settings.STORAGE_BACKEND,
        storage_path=storage_path,
        uploaded_by=user_id,
        resource_type=resource_type,
        resource_id=resource_id,
        category=category,
        has_thumbnail=has_thumb,
        checksum_sha256=checksum,
        is_public=is_public,
        scan_status=scan_status,
        scan_result=scan_result,
        status=doc_status,
    )
    db.add(doc)
    await db.flush()

    return doc


# -- Read / Query -------------------------------------------------------------


async def get_document_by_uuid(
    db: AsyncSession,
    doc_uuid: str,
    user_id: int | None = None,
    include_deleted: bool = False,
) -> StorageDocument | None:
    """Fetch a document by UUID, optionally scoped to a user."""
    query = select(StorageDocument).where(StorageDocument.uuid == doc_uuid)
    if user_id is not None:
        query = query.where(StorageDocument.uploaded_by == user_id)
    if not include_deleted:
        query = query.where(StorageDocument.deleted_at.is_(None))
    result = await db.execute(query)
    return result.scalar_one_or_none()


# -- Delete -------------------------------------------------------------------


async def soft_delete_document(
    db: AsyncSession,
    doc: StorageDocument,
) -> None:
    """Soft-delete a document."""
    doc.deleted_at = datetime.now(timezone.utc)
    await db.flush()


async def hard_delete_document(
    db: AsyncSession,
    doc: StorageDocument,
) -> None:
    """Hard-delete: remove file from storage and DB record."""
    storage = get_storage_backend()
    await storage.delete(doc.storage_path)
    if doc.has_thumbnail:
        thumb_path = f"thumbs/{doc.storage_path}"
        await storage.delete(thumb_path)
    await db.delete(doc)
    await db.flush()


# -- List (user) --------------------------------------------------------------


async def list_user_files(
    db: AsyncSession,
    user_id: int,
    pagination: PaginationParams,
    resource_type: str | None = None,
    resource_id: int | None = None,
) -> tuple[list[dict], int, int]:
    """Paginated list of a user's files (approved + own pending)."""
    from .._identity.models import User
    from ..pagination import paginate

    query = (
        select(StorageDocument, User)
        .outerjoin(User, StorageDocument.uploaded_by == User.id)
        .where(
            StorageDocument.uploaded_by == user_id,
            StorageDocument.deleted_at.is_(None),
            or_(
                StorageDocument.status == "approved",
                StorageDocument.status == "pending",
            ),
        )
    )

    if resource_type:
        query = query.where(StorageDocument.resource_type == resource_type)
    if resource_id is not None:
        query = query.where(StorageDocument.resource_id == resource_id)

    sort_whitelist = {
        "created_at": StorageDocument.created_at,
        "original_filename": StorageDocument.original_filename,
        "size_bytes": StorageDocument.size_bytes,
    }

    result, total, pages = await paginate(
        db, query, pagination,
        sort_whitelist=sort_whitelist,
        default_sort_column=StorageDocument.created_at,
    )

    rows = []
    for doc, user in result.all():
        rows.append(_doc_to_dict(doc, user))

    return rows, total, pages


# -- List (admin) -------------------------------------------------------------


async def list_all_files_admin(
    db: AsyncSession,
    pagination: PaginationParams,
    mime_filter: str | None = None,
    status_filter: str | None = None,
) -> tuple[list[dict], int, int]:
    """Admin paginated list of all files."""
    from .._identity.models import User
    from ..pagination import paginate, search_like_pattern

    query = (
        select(StorageDocument, User)
        .outerjoin(User, StorageDocument.uploaded_by == User.id)
        .where(StorageDocument.deleted_at.is_(None))
    )

    if pagination.search:
        like = search_like_pattern(pagination.search)
        query = query.where(
            or_(
                StorageDocument.original_filename.ilike(like),
                StorageDocument.mime_type.ilike(like),
            )
        )

    if mime_filter == "images":
        query = query.where(StorageDocument.mime_type.like("image/%"))
    elif mime_filter == "documents":
        query = query.where(
            or_(
                StorageDocument.mime_type.like("application/pdf%"),
                StorageDocument.mime_type.like("application/msword%"),
                StorageDocument.mime_type.like("application/vnd.%"),
                StorageDocument.mime_type.like("text/%"),
            )
        )
    elif mime_filter == "other":
        query = query.where(
            ~StorageDocument.mime_type.like("image/%"),
            ~StorageDocument.mime_type.like("application/pdf%"),
            ~StorageDocument.mime_type.like("application/msword%"),
            ~StorageDocument.mime_type.like("application/vnd.%"),
            ~StorageDocument.mime_type.like("text/%"),
        )

    if status_filter and status_filter in ("pending", "approved", "rejected"):
        query = query.where(StorageDocument.status == status_filter)

    sort_whitelist = {
        "created_at": StorageDocument.created_at,
        "original_filename": StorageDocument.original_filename,
        "size_bytes": StorageDocument.size_bytes,
        "mime_type": StorageDocument.mime_type,
    }

    result, total, pages = await paginate(
        db, query, pagination,
        sort_whitelist=sort_whitelist,
        default_sort_column=StorageDocument.created_at,
    )

    rows = []
    for doc, user in result.all():
        rows.append(_doc_to_dict(doc, user))

    return rows, total, pages


# -- Moderation ---------------------------------------------------------------


async def approve_document(
    db: AsyncSession,
    doc: StorageDocument,
    moderator_id: int,
) -> None:
    """Approve a pending document."""
    doc.status = "approved"
    doc.moderated_by_id = moderator_id
    doc.moderated_at = datetime.now(timezone.utc)
    await db.flush()


async def reject_document(
    db: AsyncSession,
    doc: StorageDocument,
    moderator_id: int,
) -> None:
    """Reject a pending document."""
    doc.status = "rejected"
    doc.moderated_by_id = moderator_id
    doc.moderated_at = datetime.now(timezone.utc)
    await db.flush()


async def list_moderation_queue(
    db: AsyncSession,
    pagination: PaginationParams,
    status_filter: str | None = None,
) -> tuple[list[dict], int, int]:
    """List files in the moderation queue."""
    from .._identity.models import User
    from ..pagination import paginate, search_like_pattern

    query = (
        select(StorageDocument, User)
        .outerjoin(User, StorageDocument.uploaded_by == User.id)
        .where(StorageDocument.deleted_at.is_(None))
    )

    if status_filter and status_filter in ("pending", "approved", "rejected"):
        query = query.where(StorageDocument.status == status_filter)
    else:
        query = query.where(StorageDocument.status == "pending")

    if pagination.search:
        like = search_like_pattern(pagination.search)
        query = query.where(
            or_(
                StorageDocument.original_filename.ilike(like),
                StorageDocument.mime_type.ilike(like),
            )
        )

    sort_whitelist = {
        "created_at": StorageDocument.created_at,
        "original_filename": StorageDocument.original_filename,
        "size_bytes": StorageDocument.size_bytes,
    }

    result, total, pages = await paginate(
        db, query, pagination,
        sort_whitelist=sort_whitelist,
        default_sort_column=StorageDocument.created_at,
    )

    rows = []
    for doc, user in result.all():
        rows.append(_doc_to_dict(doc, user))

    return rows, total, pages


# -- Policies -----------------------------------------------------------------


async def list_policies(db: AsyncSession) -> list[dict]:
    """List all file storage policies."""
    result = await db.execute(
        select(FileStoragePolicy).order_by(FileStoragePolicy.resource_type)
    )
    policies = result.scalars().all()
    return [
        {
            "resource_type": p.resource_type,
            "requires_moderation": p.requires_moderation,
            "updated_at": p.updated_at,
            "updated_by_id": p.updated_by_id,
        }
        for p in policies
    ]


async def upsert_policy(
    db: AsyncSession,
    resource_type: str,
    requires_moderation: bool,
    user_id: int,
) -> FileStoragePolicy:
    """Create or update a file storage policy."""
    policy = await db.get(FileStoragePolicy, resource_type)
    if policy:
        policy.requires_moderation = requires_moderation
        policy.updated_by_id = user_id
        policy.updated_at = datetime.now(timezone.utc)
    else:
        policy = FileStoragePolicy(
            resource_type=resource_type,
            requires_moderation=requires_moderation,
            updated_by_id=user_id,
        )
        db.add(policy)
    await db.flush()
    return policy


async def delete_policy(
    db: AsyncSession,
    resource_type: str,
) -> bool:
    """Delete a file storage policy. Returns True if deleted."""
    policy = await db.get(FileStoragePolicy, resource_type)
    if not policy:
        return False
    await db.delete(policy)
    await db.flush()
    return True


# -- Stats / Quota ------------------------------------------------------------


async def get_admin_stats(db: AsyncSession) -> dict:
    """Get global file storage statistics."""
    result = await db.execute(
        select(
            func.count(StorageDocument.id),
            func.coalesce(func.sum(StorageDocument.size_bytes), 0),
            func.count(func.distinct(StorageDocument.uploaded_by)),
        ).where(StorageDocument.deleted_at.is_(None))
    )
    row = result.one()

    pending_count = await db.scalar(
        select(func.count(StorageDocument.id)).where(
            StorageDocument.deleted_at.is_(None),
            StorageDocument.status == "pending",
        )
    ) or 0

    return {
        "total_files": row[0],
        "total_size_bytes": row[1],
        "unique_uploaders": row[2],
        "pending_moderation": pending_count,
    }


async def get_user_quota(db: AsyncSession, user_id: int) -> dict:
    """Get quota usage for a user."""
    used = await get_user_usage_bytes(db, user_id)
    count = await db.scalar(
        select(func.count(StorageDocument.id)).where(
            StorageDocument.uploaded_by == user_id,
            StorageDocument.deleted_at.is_(None),
        )
    ) or 0

    return {
        "used_bytes": used,
        "max_bytes": settings.UPLOAD_QUOTA_MB * 1024 * 1024 if settings.UPLOAD_QUOTA_MB > 0 else 0,
        "file_count": count,
    }


async def get_user_usage_bytes(db: AsyncSession, user_id: int) -> int:
    """Total storage used by a user in bytes."""
    result = await db.scalar(
        select(func.coalesce(func.sum(StorageDocument.size_bytes), 0)).where(
            StorageDocument.uploaded_by == user_id,
            StorageDocument.deleted_at.is_(None),
        )
    )
    return result or 0


# -- Helpers ------------------------------------------------------------------


def _doc_to_dict(doc: StorageDocument, user=None) -> dict:
    """Convert a StorageDocument to a dict for response serialization."""
    return {
        "id": doc.id,
        "uuid": doc.uuid,
        "original_filename": doc.original_filename,
        "mime_type": doc.mime_type,
        "extension": doc.extension,
        "size_bytes": doc.size_bytes,
        "category": doc.category,
        "resource_type": doc.resource_type,
        "resource_id": doc.resource_id,
        "has_thumbnail": doc.has_thumbnail,
        "is_public": doc.is_public,
        "scan_status": doc.scan_status,
        "scan_result": doc.scan_result,
        "status": doc.status,
        "moderated_by_id": doc.moderated_by_id,
        "moderated_at": doc.moderated_at,
        "uploaded_by": doc.uploaded_by,
        "uploader_name": f"{user.first_name} {user.last_name}" if user else None,
        "storage_backend": doc.storage_backend,
        "storage_path": doc.storage_path,
        "checksum_sha256": doc.checksum_sha256,
        "deleted_at": doc.deleted_at,
        "created_at": doc.created_at,
    }
