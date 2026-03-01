"""Favorite feature services."""

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from .models import Favorite


async def list_favorites(db: AsyncSession, user_id: int) -> list[Favorite]:
    """List all favorites for a user, ordered by position."""
    result = await db.execute(
        select(Favorite)
        .where(Favorite.user_id == user_id)
        .order_by(Favorite.position.asc(), Favorite.created_at.asc())
    )
    return list(result.scalars().all())


async def create_favorite(
    db: AsyncSession,
    user_id: int,
    label: str,
    url: str,
    icon: str | None = None,
) -> Favorite:
    """Create a new favorite at the end of the list."""
    result = await db.execute(
        select(Favorite.position)
        .where(Favorite.user_id == user_id)
        .order_by(Favorite.position.desc())
        .limit(1)
    )
    max_pos = result.scalar() or 0

    fav = Favorite(
        user_id=user_id,
        label=label,
        icon=icon,
        url=url,
        position=max_pos + 1,
    )
    db.add(fav)
    await db.flush()
    return fav


async def update_favorite(
    db: AsyncSession,
    favorite_id: int,
    user_id: int,
    **updates: str | None,
) -> Favorite | None:
    """Update a favorite. Returns None if not found or not owned."""
    result = await db.execute(
        select(Favorite).where(
            Favorite.id == favorite_id,
            Favorite.user_id == user_id,
        )
    )
    fav = result.scalar_one_or_none()
    if not fav:
        return None
    for key, value in updates.items():
        if value is not None:
            setattr(fav, key, value)
    await db.flush()
    return fav


async def delete_favorite(
    db: AsyncSession,
    favorite_id: int,
    user_id: int,
) -> bool:
    """Delete a favorite. Returns True if found and deleted."""
    result = await db.execute(
        select(Favorite).where(
            Favorite.id == favorite_id,
            Favorite.user_id == user_id,
        )
    )
    fav = result.scalar_one_or_none()
    if not fav:
        return False
    await db.delete(fav)
    await db.flush()
    return True


async def reorder_favorites(
    db: AsyncSession,
    user_id: int,
    ordered_ids: list[int],
) -> None:
    """Reorder favorites by setting position = index for each ID."""
    for idx, fav_id in enumerate(ordered_ids):
        await db.execute(
            update(Favorite)
            .where(Favorite.id == fav_id, Favorite.user_id == user_id)
            .values(position=idx)
        )
    await db.flush()
