"""Data processing register endpoints — Article 30 RGPD."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..events import event_bus
from ..permissions import require_permission
from ..security import get_current_user
from .models import DataProcessingRegister
from .schemas import (
    RegisterEntryCreate,
    RegisterEntryResponse,
    RegisterEntryUpdate,
    RegisterListResponse,
)

router = APIRouter()


def _to_response(entry: DataProcessingRegister) -> RegisterEntryResponse:
    return RegisterEntryResponse(
        id=entry.id,
        name=entry.name,
        purpose=entry.purpose,
        legal_basis=entry.legal_basis,
        data_categories=entry.data_categories,
        data_subjects=entry.data_subjects,
        recipients=entry.recipients,
        retention_period=entry.retention_period,
        security_measures=entry.security_measures,
        is_active=entry.is_active,
        created_by_id=entry.created_by_id,
        created_at=entry.created_at,
        updated_at=entry.updated_at,
    )


@router.get(
    "/",
    response_model=RegisterListResponse,
    dependencies=[Depends(require_permission("rgpd.registre.read"))],
)
async def list_register_entries(db: AsyncSession = Depends(get_db)):
    """List all data processing register entries."""
    result = await db.execute(
        select(DataProcessingRegister).order_by(DataProcessingRegister.name)
    )
    items = result.scalars().all()
    return RegisterListResponse(
        items=[_to_response(e) for e in items],
        total=len(items),
    )


@router.post(
    "/",
    response_model=RegisterEntryResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("rgpd.registre.create"))],
)
async def create_register_entry(
    data: RegisterEntryCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new data processing register entry."""
    entry = DataProcessingRegister(
        name=data.name,
        purpose=data.purpose,
        legal_basis=data.legal_basis,
        data_categories=data.data_categories,
        data_subjects=data.data_subjects,
        recipients=data.recipients,
        retention_period=data.retention_period,
        security_measures=data.security_measures,
        created_by_id=current_user.id,
    )
    db.add(entry)
    await db.flush()

    await event_bus.emit(
        "rgpd.register_created",
        db=db,
        actor_id=current_user.id,
        resource_type="data_processing_register",
        resource_id=entry.id,
    )

    return _to_response(entry)


@router.put(
    "/{entry_id}",
    response_model=RegisterEntryResponse,
    dependencies=[Depends(require_permission("rgpd.registre.update"))],
)
async def update_register_entry(
    entry_id: int,
    data: RegisterEntryUpdate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a data processing register entry."""
    result = await db.execute(
        select(DataProcessingRegister).where(DataProcessingRegister.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Entree non trouvee")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(entry, field, value)

    entry.updated_at = datetime.now(timezone.utc)
    await db.flush()

    await event_bus.emit(
        "rgpd.register_updated",
        db=db,
        actor_id=current_user.id,
        resource_type="data_processing_register",
        resource_id=entry.id,
    )

    return _to_response(entry)


@router.delete(
    "/{entry_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("rgpd.registre.delete"))],
)
async def delete_register_entry(
    entry_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a data processing register entry."""
    result = await db.execute(
        select(DataProcessingRegister).where(DataProcessingRegister.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Entree non trouvee")

    entry_id_for_event = entry.id
    await db.delete(entry)
    await db.flush()

    await event_bus.emit(
        "rgpd.register_deleted",
        db=db,
        actor_id=current_user.id,
        resource_type="data_processing_register",
        resource_id=entry_id_for_event,
    )
