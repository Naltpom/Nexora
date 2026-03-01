"""Announcement feature routes."""

import os
import shutil
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..database import get_db
from ..events import event_bus
from ..pagination import PaginatedResponse, PaginationParams
from ..permissions import require_permission
from ..realtime.services import sse_broadcaster
from ..security import get_current_user
from .models import Announcement
from .schemas import (
    AcknowledgmentDetail,
    AnnouncementAdminResponse,
    AnnouncementCreate,
    AnnouncementModalResponse,
    AnnouncementResponse,
    AnnouncementUpdate,
)
from .services import (
    count_unread_modal_announcements as svc_count_unread_modal,
)
from .services import (
    dismiss_announcement as svc_dismiss,
)
from .services import (
    get_acknowledgment_details as svc_ack_details,
)
from .services import (
    list_active_announcements as svc_list_active,
)
from .services import (
    list_active_modal_announcements as svc_list_active_modal,
)
from .services import (
    list_announcements_admin as svc_list_admin,
)
from .services import (
    list_modal_announcements_user as svc_list_modal_user,
)

RTE_UPLOAD_DIR = os.path.join(settings.UPLOAD_DIR, "rte")

router = APIRouter()


# -- User-facing: banners ------------------------------------------------------


@router.get(
    "/active",
    response_model=list[AnnouncementResponse],
    dependencies=[Depends(require_permission("announcement.read"))],
)
async def list_active(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Liste des annonces bannieres actives pour l'utilisateur courant."""
    rows = await svc_list_active(db, current_user.id)
    return [AnnouncementResponse(**row) for row in rows]


@router.post(
    "/{announcement_id}/dismiss",
    dependencies=[Depends(require_permission("announcement.read"))],
)
async def dismiss(
    announcement_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Masquer/valider une annonce pour l'utilisateur courant."""
    found = await svc_dismiss(db, announcement_id, current_user.id)
    if not found:
        raise HTTPException(status_code=404, detail="Annonce introuvable ou non masquable")
    return {"ok": True}


# -- User-facing: modals -------------------------------------------------------


@router.get(
    "/modal/active",
    response_model=list[AnnouncementModalResponse],
    dependencies=[Depends(require_permission("announcement.read"))],
)
async def list_active_modal(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Modales actives non-lues pour l'utilisateur courant."""
    rows = await svc_list_active_modal(db, current_user.id)
    return [AnnouncementModalResponse(**row) for row in rows]


@router.get(
    "/modal/unread-count",
    dependencies=[Depends(require_permission("announcement.read"))],
)
async def modal_unread_count(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Compteur de modales non-lues pour le badge megaphone."""
    count = await svc_count_unread_modal(db, current_user.id)
    return {"count": count}


@router.get(
    "/modal/",
    response_model=PaginatedResponse[AnnouncementModalResponse],
    dependencies=[Depends(require_permission("announcement.read"))],
)
async def list_modal_user(
    current_user=Depends(get_current_user),
    pagination: PaginationParams = Depends(PaginationParams(
        default_per_page=20,
        default_sort_by="created_at",
        default_sort_dir="desc",
    )),
    db: AsyncSession = Depends(get_db),
):
    """Historique pagine des modales pour l'utilisateur courant."""
    rows, total, pages = await svc_list_modal_user(db, current_user.id, pagination)
    items = [AnnouncementModalResponse(**row) for row in rows]
    return PaginatedResponse(
        items=items, total=total, page=pagination.page, per_page=pagination.per_page, pages=pages,
    )


# -- RTE image upload ----------------------------------------------------------


@router.post(
    "/upload-image",
    dependencies=[Depends(require_permission("announcement.manage"))],
)
async def upload_rte_image(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    """Upload an image for the rich text editor."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Le fichier doit etre une image")

    if file.size and file.size > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Le fichier ne doit pas depasser 5 Mo")

    os.makedirs(RTE_UPLOAD_DIR, exist_ok=True)

    ext = os.path.splitext(file.filename or "image.png")[1] or ".png"
    filename = f"{uuid.uuid4().hex[:12]}{ext}"
    filepath = os.path.join(RTE_UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    return {"url": f"/api/uploads/rte/{filename}"}


# -- SSE helper ----------------------------------------------------------------


async def _broadcast_announcement(ann: Announcement, action: str = "created"):
    """Broadcast SSE event if announcement is currently active."""
    now = datetime.now(timezone.utc)
    if ann.is_active and ann.start_date <= now and (ann.end_date is None or ann.end_date > now):
        await sse_broadcaster.broadcast_all(
            event_type="announcement",
            data={
                "action": action,
                "id": ann.id,
                "display": ann.display,
                "requires_acknowledgment": ann.requires_acknowledgment,
                "title": ann.title,
            },
        )


# -- Admin CRUD ----------------------------------------------------------------


@router.get(
    "/",
    response_model=PaginatedResponse[AnnouncementAdminResponse],
    dependencies=[Depends(require_permission("announcement.manage"))],
)
async def list_admin(
    pagination: PaginationParams = Depends(PaginationParams(
        default_per_page=20,
        default_sort_by="created_at",
        default_sort_dir="desc",
    )),
    db: AsyncSession = Depends(get_db),
):
    """Liste admin paginee de toutes les annonces."""
    rows, total, pages = await svc_list_admin(db, pagination)
    items = [AnnouncementAdminResponse(**row) for row in rows]
    return PaginatedResponse(
        items=items, total=total, page=pagination.page, per_page=pagination.per_page, pages=pages,
    )


@router.post(
    "/",
    response_model=AnnouncementAdminResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("announcement.manage"))],
)
async def create(
    data: AnnouncementCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Creer une annonce."""
    ann = Announcement(
        created_by_id=current_user.id,
        **data.model_dump(),
    )
    db.add(ann)
    await db.flush()

    await event_bus.emit(
        "announcement.created",
        db=db,
        actor_id=current_user.id,
        resource_type="announcement",
        resource_id=ann.id,
        payload={
            "actor_name": f"{current_user.first_name} {current_user.last_name}",
            "title": ann.title,
        },
    )

    # Push SSE to all connected users
    await _broadcast_announcement(ann, "created")

    return AnnouncementAdminResponse(
        id=ann.id,
        title=ann.title,
        body=ann.body,
        type=ann.type,
        display=ann.display,
        requires_acknowledgment=ann.requires_acknowledgment,
        target_roles=ann.target_roles,
        start_date=ann.start_date,
        end_date=ann.end_date,
        is_dismissible=ann.is_dismissible,
        priority=ann.priority,
        is_active=ann.is_active,
        created_by_id=ann.created_by_id,
        created_by_name=f"{current_user.first_name} {current_user.last_name}",
        acknowledged_count=0,
        target_count=0,
        created_at=ann.created_at,
        updated_at=ann.updated_at,
    )


@router.put(
    "/{announcement_id}",
    response_model=AnnouncementAdminResponse,
    dependencies=[Depends(require_permission("announcement.manage"))],
)
async def update(
    announcement_id: int,
    data: AnnouncementUpdate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Modifier une annonce."""
    result = await db.execute(
        select(Announcement).where(Announcement.id == announcement_id)
    )
    ann = result.scalar_one_or_none()
    if not ann:
        raise HTTPException(status_code=404, detail="Annonce introuvable")

    provided = data.model_dump(exclude_unset=True)
    for field, value in provided.items():
        setattr(ann, field, value)
    await db.flush()

    await event_bus.emit(
        "announcement.updated",
        db=db,
        actor_id=current_user.id,
        resource_type="announcement",
        resource_id=ann.id,
        payload={
            "actor_name": f"{current_user.first_name} {current_user.last_name}",
            "title": ann.title,
            "fields": list(provided.keys()),
        },
    )

    # Push SSE if announcement is active now
    await _broadcast_announcement(ann, "updated")

    from .._identity.models import User
    creator = await db.scalar(select(User).where(User.id == ann.created_by_id)) if ann.created_by_id else None
    created_by_name = f"{creator.first_name} {creator.last_name}" if creator else None

    return AnnouncementAdminResponse(
        id=ann.id,
        title=ann.title,
        body=ann.body,
        type=ann.type,
        display=ann.display,
        requires_acknowledgment=ann.requires_acknowledgment,
        target_roles=ann.target_roles,
        start_date=ann.start_date,
        end_date=ann.end_date,
        is_dismissible=ann.is_dismissible,
        priority=ann.priority,
        is_active=ann.is_active,
        created_by_id=ann.created_by_id,
        created_by_name=created_by_name,
        acknowledged_count=0,
        target_count=0,
        created_at=ann.created_at,
        updated_at=ann.updated_at,
    )


@router.delete(
    "/{announcement_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("announcement.manage"))],
)
async def delete(
    announcement_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Supprimer une annonce."""
    result = await db.execute(
        select(Announcement).where(Announcement.id == announcement_id)
    )
    ann = result.scalar_one_or_none()
    if not ann:
        raise HTTPException(status_code=404, detail="Annonce introuvable")

    title = ann.title
    await db.delete(ann)
    await db.flush()

    await event_bus.emit(
        "announcement.deleted",
        db=db,
        actor_id=current_user.id,
        resource_type="announcement",
        resource_id=announcement_id,
        payload={
            "actor_name": f"{current_user.first_name} {current_user.last_name}",
            "title": title,
        },
    )


# -- Admin: acknowledgment details ---------------------------------------------


@router.get(
    "/{announcement_id}/acknowledgments",
    response_model=list[AcknowledgmentDetail],
    dependencies=[Depends(require_permission("announcement.manage"))],
)
async def acknowledgments(
    announcement_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Liste des utilisateurs ayant valide une annonce."""
    result = await db.execute(
        select(Announcement).where(Announcement.id == announcement_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Annonce introuvable")

    rows = await svc_ack_details(db, announcement_id)
    return [AcknowledgmentDetail(**row) for row in rows]
