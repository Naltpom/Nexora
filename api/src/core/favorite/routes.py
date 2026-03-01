"""Favorite feature routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..events import event_bus
from ..permissions import require_permission
from ..security import get_current_user
from .schemas import FavoriteCreate, FavoriteReorder, FavoriteResponse, FavoriteUpdate
from .services import (
    create_favorite as svc_create,
)
from .services import (
    delete_favorite as svc_delete,
)
from .services import (
    list_favorites as svc_list,
)
from .services import (
    reorder_favorites as svc_reorder,
)
from .services import (
    update_favorite as svc_update,
)

router = APIRouter()


@router.get(
    "/",
    response_model=list[FavoriteResponse],
    dependencies=[Depends(require_permission("favorite.read"))],
)
async def list_favorites_endpoint(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Liste des favoris de l'utilisateur courant."""
    favs = await svc_list(db, current_user.id)
    return [
        FavoriteResponse(
            id=f.id,
            label=f.label,
            icon=f.icon,
            url=f.url,
            position=f.position,
            created_at=f.created_at,
        )
        for f in favs
    ]


@router.post(
    "/",
    response_model=FavoriteResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("favorite.manage"))],
)
async def create_favorite_endpoint(
    data: FavoriteCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Ajouter un favori."""
    fav = await svc_create(
        db,
        user_id=current_user.id,
        label=data.label,
        url=data.url,
        icon=data.icon,
    )

    await event_bus.emit(
        "favorite.created",
        db=db,
        actor_id=current_user.id,
        resource_type="favorite",
        resource_id=fav.id,
        payload={"label": fav.label, "url": fav.url},
    )

    return FavoriteResponse(
        id=fav.id,
        label=fav.label,
        icon=fav.icon,
        url=fav.url,
        position=fav.position,
        created_at=fav.created_at,
    )


@router.put(
    "/{favorite_id}",
    response_model=FavoriteResponse,
    dependencies=[Depends(require_permission("favorite.manage"))],
)
async def update_favorite_endpoint(
    favorite_id: int,
    data: FavoriteUpdate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Modifier le label/icone d'un favori."""
    provided = data.model_dump(exclude_unset=True)
    fav = await svc_update(db, favorite_id, current_user.id, **provided)
    if not fav:
        raise HTTPException(status_code=404, detail="Favori introuvable")

    await event_bus.emit(
        "favorite.updated",
        db=db,
        actor_id=current_user.id,
        resource_type="favorite",
        resource_id=fav.id,
        payload={"label": fav.label, "fields": list(provided.keys())},
    )

    return FavoriteResponse(
        id=fav.id,
        label=fav.label,
        icon=fav.icon,
        url=fav.url,
        position=fav.position,
        created_at=fav.created_at,
    )


@router.delete(
    "/{favorite_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("favorite.manage"))],
)
async def delete_favorite_endpoint(
    favorite_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Supprimer un favori."""
    found = await svc_delete(db, favorite_id, current_user.id)
    if not found:
        raise HTTPException(status_code=404, detail="Favori introuvable")

    await event_bus.emit(
        "favorite.deleted",
        db=db,
        actor_id=current_user.id,
        resource_type="favorite",
        resource_id=favorite_id,
        payload={},
    )


@router.put(
    "/reorder",
    dependencies=[Depends(require_permission("favorite.manage"))],
)
async def reorder_favorites_endpoint(
    data: FavoriteReorder,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Reordonner les favoris."""
    await svc_reorder(db, current_user.id, data.ids)
    return {"ok": True}
