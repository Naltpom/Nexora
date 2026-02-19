"""User CRUD endpoints."""

import math
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_db
from ...core.permissions import require_permission
from ...core.security import get_current_super_admin, hash_password
from .models import User
from .schemas import (
    UserCreate,
    UserPaginatedResponse,
    UserResponse,
    UserUpdate,
)

router = APIRouter()


def _user_to_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        auth_source=user.auth_source,
        is_active=user.is_active,
        is_super_admin=user.is_super_admin,
        must_change_password=user.must_change_password,
        last_login=user.last_login,
        last_active=user.last_active,
        created_at=user.created_at,
    )


@router.get(
    "/",
    response_model=UserPaginatedResponse,
    dependencies=[Depends(require_permission("users.read"))],
)
async def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: str = Query("", description="Search email, first_name, last_name"),
    active_only: bool = Query(True, description="Filter active users only"),
    sort_by: str = Query("email", description="Sort field: email, first_name, last_name"),
    sort_dir: str = Query("asc", description="Sort direction: asc or desc"),
    db: AsyncSession = Depends(get_db),
):
    query = select(User)

    if active_only:
        query = query.where(User.is_active.is_(True))

    if search:
        like = f"%{search}%"
        query = query.where(
            or_(
                User.email.ilike(like),
                User.first_name.ilike(like),
                User.last_name.ilike(like),
            )
        )

    # Count total
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar_one()

    # Sorting
    sort_col = getattr(User, sort_by, User.email)
    if sort_dir.lower() == "desc":
        sort_col = sort_col.desc()
    else:
        sort_col = sort_col.asc()
    query = query.order_by(sort_col)

    # Pagination
    offset = (page - 1) * per_page
    query = query.offset(offset).limit(per_page)

    result = await db.execute(query)
    users = result.scalars().all()

    pages = max(1, math.ceil(total / per_page))
    return UserPaginatedResponse(
        items=[_user_to_response(u) for u in users],
        total=total,
        page=page,
        per_page=per_page,
        pages=pages,
    )


@router.post(
    "/",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("users.create"))],
)
async def create_user(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Un utilisateur avec cet email existe deja")

    user = User(
        email=data.email,
        first_name=data.first_name,
        last_name=data.last_name,
        auth_source=data.auth_source,
        is_super_admin=data.is_super_admin,
        must_change_password=data.must_change_password,
        is_active=True,
    )
    if data.password:
        user.password_hash = hash_password(data.password)

    db.add(user)
    await db.flush()
    return _user_to_response(user)


@router.put(
    "/{user_id}",
    response_model=UserResponse,
    dependencies=[Depends(require_permission("users.update"))],
)
async def update_user(
    user_id: int,
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    if data.email is not None:
        user.email = data.email
    if data.first_name is not None:
        user.first_name = data.first_name
    if data.last_name is not None:
        user.last_name = data.last_name
    if data.is_active is not None:
        user.is_active = data.is_active
    if data.is_super_admin is not None:
        user.is_super_admin = data.is_super_admin
    if data.must_change_password is not None:
        user.must_change_password = data.must_change_password

    await db.flush()
    return _user_to_response(user)


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("users.delete"))],
)
async def delete_user(
    user_id: int,
    current_user=Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Impossible de supprimer votre propre compte")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    await db.delete(user)
    await db.flush()


@router.post(
    "/{user_id}/reset-password",
    dependencies=[Depends(require_permission("users.update"))],
)
async def trigger_reset_password(
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    if user.auth_source != "local":
        raise HTTPException(
            status_code=400,
            detail="La reinitialisation du mot de passe n'est disponible que pour les comptes locaux",
        )

    token = str(uuid.uuid4())
    user.password_reset_token = hash_password(token)
    user.password_reset_expires = datetime.now(timezone.utc) + timedelta(minutes=30)
    await db.flush()

    try:
        from ..notification.email.services import get_email_sender

        sender = get_email_sender()
        sent = sender.send_reset_password(
            to_email=user.email,
            to_name=f"{user.first_name} {user.last_name}",
            reset_token=token,
        )
        if not sent:
            return {"message": "Email desactive -- token genere mais email non envoye", "token": token}
    except Exception:
        return {"message": "Email desactive -- token genere mais email non envoye", "token": token}

    return {"message": "Email de reinitialisation envoye"}
