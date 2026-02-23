"""User CRUD endpoints."""

import math
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete as sa_delete
from sqlalchemy import func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..database import get_db
from ..events import event_bus
from ..permissions import invalidate_permission_cache, load_user_permissions, require_permission
from ..security import get_current_user, hash_password
from .models import (
    GlobalPermission,
    Permission,
    Role,
    RolePermission,
    User,
    UserPermission,
    UserRole,
)
from .schemas import (
    ResolvedPermission,
    RoleBasic,
    UserCreate,
    UserDetailResponse,
    UserListItem,
    UserListPaginatedResponse,
    UserPermissionOverrideRequest,
    UserResponse,
    UserRolesUpdateRequest,
    UserUpdate,
)
from .services import create_security_token

router = APIRouter()


def _user_to_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        uuid=str(user.uuid) if user.uuid else None,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        auth_source=user.auth_source,
        is_active=user.is_active,
        must_change_password=user.must_change_password,
        last_login=user.last_login,
        last_active=user.last_active,
        created_at=user.created_at,
    )


@router.get(
    "/",
    response_model=UserListPaginatedResponse,
    dependencies=[Depends(require_permission("users.read"))],
)
async def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: str = Query("", description="Search email, first_name, last_name"),
    active_only: bool = Query(True, description="Filter active users only"),
    sort_by: str = Query("email", description="Sort field: email, first_name, last_name"),
    sort_dir: str = Query("asc", description="Sort direction: asc or desc"),
    role_ids: str = Query("", description="Comma-separated role IDs to filter by"),
    db: AsyncSession = Depends(get_db),
):
    query = select(User).where(User.deleted_at.is_(None))

    if active_only:
        query = query.where(User.is_active.is_(True))

    if search:
        search_escaped = search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        like = f"%{search_escaped}%"
        query = query.where(
            or_(
                User.email.ilike(like),
                User.first_name.ilike(like),
                User.last_name.ilike(like),
            )
        )

    # Filter by role IDs
    if role_ids:
        ids = [int(x) for x in role_ids.split(",") if x.strip().isdigit()]
        if ids:
            query = query.where(
                User.id.in_(select(UserRole.user_id).where(UserRole.role_id.in_(ids)))
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
    user_ids = [u.id for u in users]

    # Batch-load roles for all users on this page
    user_roles_map: dict[int, list[RoleBasic]] = {}
    if user_ids:
        role_result = await db.execute(
            select(UserRole.user_id, Role)
            .join(Role, Role.id == UserRole.role_id)
            .where(UserRole.user_id.in_(user_ids))
        )
        for uid, role in role_result.all():
            user_roles_map.setdefault(uid, []).append(
                RoleBasic(id=role.id, slug=role.slug, name=role.name, color=role.color)
            )

    # Batch-compute impersonation immunity
    immune_user_ids: set[int] = set()
    if user_ids:
        immune_perm = await db.execute(
            select(Permission.id).where(Permission.code == "impersonation.immune")
        )
        immune_perm_id = immune_perm.scalar_one_or_none()

        if immune_perm_id:
            # Check via roles
            immune_role_result = await db.execute(
                select(RolePermission.role_id).where(RolePermission.permission_id == immune_perm_id)
            )
            immune_role_ids = {r for (r,) in immune_role_result.all()}
            if immune_role_ids:
                immune_via_role = await db.execute(
                    select(UserRole.user_id).where(
                        UserRole.user_id.in_(user_ids),
                        UserRole.role_id.in_(immune_role_ids),
                    )
                )
                immune_user_ids.update(r for (r,) in immune_via_role.all())

            # Check via user permission overrides
            immune_via_user = await db.execute(
                select(UserPermission.user_id).where(
                    UserPermission.user_id.in_(user_ids),
                    UserPermission.permission_id == immune_perm_id,
                    UserPermission.granted.is_(True),
                )
            )
            immune_user_ids.update(r for (r,) in immune_via_user.all())

            # Check via global permissions
            global_immune = await db.execute(
                select(GlobalPermission.granted).where(
                    GlobalPermission.permission_id == immune_perm_id
                )
            )
            global_immune_val = global_immune.scalar_one_or_none()
            if global_immune_val is True:
                immune_user_ids.update(user_ids)

    # Build response items
    items = []
    for u in users:
        item = UserListItem(
            **_user_to_response(u).model_dump(),
            roles=user_roles_map.get(u.id, []),
            is_impersonation_immune=u.id in immune_user_ids,
        )
        items.append(item)

    pages = max(1, math.ceil(total / per_page))
    return UserListPaginatedResponse(
        items=items,
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
        must_change_password=data.must_change_password,
        is_active=True,
    )
    if data.password:
        user.password_hash = hash_password(data.password)

    db.add(user)
    await db.flush()

    await event_bus.emit(
        "user.registered",
        db=db,
        actor_id=user.id,
        resource_type="user",
        resource_id=user.id,
        payload={
            "actor_name": f"{user.first_name} {user.last_name}",
            "user_name": f"{user.first_name} {user.last_name}",
            "email": user.email,
            "auth_source": user.auth_source,
        },
    )

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

    was_active = user.is_active

    if data.email is not None:
        user.email = data.email
    if data.first_name is not None:
        user.first_name = data.first_name
    if data.last_name is not None:
        user.last_name = data.last_name
    if data.is_active is not None:
        user.is_active = data.is_active
    if data.must_change_password is not None:
        user.must_change_password = data.must_change_password

    await db.flush()

    await event_bus.emit(
        "user.updated",
        db=db,
        actor_id=user_id,
        resource_type="user",
        resource_id=user_id,
        payload={
            "actor_name": f"{user.first_name} {user.last_name}",
            "email": user.email,
        },
    )

    if was_active and not user.is_active:
        await event_bus.emit(
            "user.deactivated",
            db=db,
            actor_id=user_id,
            resource_type="user",
            resource_id=user_id,
            payload={
                "actor_name": f"{user.first_name} {user.last_name}",
                "target_name": f"{user.first_name} {user.last_name}",
                "email": user.email,
            },
        )

    return _user_to_response(user)


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("users.delete"))],
)
async def delete_user(
    user_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Impossible de supprimer votre propre compte")

    result = await db.execute(select(User).where(User.id == user_id, User.deleted_at.is_(None)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    user.deleted_at = datetime.now(timezone.utc)
    user.is_active = False
    user.email = f"deleted_{user.id}_{user.email}"
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
    await create_security_token(db, user.id, "password_reset", token, expires_minutes=30)

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


# ---------------------------------------------------------------------------
#  User detail by UUID
# ---------------------------------------------------------------------------


async def _get_user_by_uuid(user_uuid: str, db: AsyncSession) -> User:
    """Lookup user by UUID string, raise 404 if not found."""
    try:
        parsed = uuid.UUID(user_uuid)
    except ValueError:
        raise HTTPException(status_code=400, detail="UUID invalide")
    result = await db.execute(select(User).where(User.uuid == parsed))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    return user


async def _resolve_permissions(db: AsyncSession, user_id: int) -> list[ResolvedPermission]:
    """Build the full resolved permission list for a user.

    Uses a dedicated REPEATABLE READ session for a consistent snapshot
    across all queries (prevents race conditions during concurrent
    permission modifications).
    """
    from ..database import async_session

    async with async_session() as rr_db:
        await rr_db.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ"))

        # 1. All permissions
        result = await rr_db.execute(select(Permission).order_by(Permission.feature, Permission.code))
        all_perms = result.scalars().all()

        # 2. User's role IDs
        result = await rr_db.execute(select(UserRole.role_id).where(UserRole.user_id == user_id))
        user_role_ids = [r for (r,) in result.all()]

        # 3. Role-granted permission IDs
        role_perm_ids: set[int] = set()
        if user_role_ids:
            from .models import RolePermission
            result = await rr_db.execute(
                select(RolePermission.permission_id).where(
                    RolePermission.role_id.in_(user_role_ids)
                )
            )
            role_perm_ids = {r for (r,) in result.all()}

        # 4. User overrides
        result = await rr_db.execute(
            select(UserPermission).where(UserPermission.user_id == user_id)
        )
        user_overrides: dict[int, bool] = {up.permission_id: up.granted for up in result.scalars().all()}

        # 5. Global permissions
        result = await rr_db.execute(select(GlobalPermission))
        global_perms: dict[int, bool] = {gp.permission_id: gp.granted for gp in result.scalars().all()}

    # 6. Resolve (in memory, outside the session)
    resolved = []
    for perm in all_perms:
        user_ov = user_overrides.get(perm.id)
        role_gr = perm.id in role_perm_ids
        global_gr = global_perms.get(perm.id)

        # Resolution order: user > role > global
        if user_ov is not None:
            effective = user_ov
            source = "user"
        elif role_gr:
            effective = True
            source = "role"
        elif global_gr is not None:
            effective = global_gr
            source = "global"
        else:
            effective = False
            source = "none"

        resolved.append(ResolvedPermission(
            permission_id=perm.id,
            code=perm.code,
            label=perm.label,
            description=perm.description,
            feature=perm.feature,
            effective=effective,
            source=source,
            user_override=user_ov,
            role_granted=True if role_gr else None,
            global_granted=global_gr,
        ))

    return resolved


@router.get(
    "/by-uuid/{user_uuid}",
    response_model=UserDetailResponse,
    dependencies=[Depends(require_permission("users.read"))],
)
async def get_user_detail(user_uuid: str, db: AsyncSession = Depends(get_db)):
    """Get user detail with roles and resolved permissions."""
    user = await _get_user_by_uuid(user_uuid, db)

    # Roles
    result = await db.execute(
        select(Role).join(UserRole, UserRole.role_id == Role.id).where(UserRole.user_id == user.id)
    )
    roles = [RoleBasic.model_validate(r) for r in result.scalars().all()]

    # Resolved permissions
    resolved = await _resolve_permissions(db, user.id)

    return UserDetailResponse(
        **_user_to_response(user).model_dump(),
        roles=roles,
        resolved_permissions=resolved,
    )


@router.put(
    "/by-uuid/{user_uuid}",
    response_model=UserResponse,
    dependencies=[Depends(require_permission("users.update"))],
)
async def update_user_by_uuid(
    user_uuid: str,
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update user profile by UUID."""
    user = await _get_user_by_uuid(user_uuid, db)
    was_active = user.is_active

    if data.email is not None:
        user.email = data.email
    if data.first_name is not None:
        user.first_name = data.first_name
    if data.last_name is not None:
        user.last_name = data.last_name
    if data.is_active is not None:
        user.is_active = data.is_active
    if data.must_change_password is not None:
        user.must_change_password = data.must_change_password

    await db.flush()

    await event_bus.emit(
        "user.updated",
        db=db,
        actor_id=user.id,
        resource_type="user",
        resource_id=user.id,
        payload={
            "actor_name": f"{user.first_name} {user.last_name}",
            "email": user.email,
        },
    )

    if was_active and not user.is_active:
        await event_bus.emit(
            "user.deactivated",
            db=db,
            actor_id=user.id,
            resource_type="user",
            resource_id=user.id,
            payload={
                "actor_name": f"{user.first_name} {user.last_name}",
                "target_name": f"{user.first_name} {user.last_name}",
                "email": user.email,
            },
        )

    return _user_to_response(user)


@router.put(
    "/by-uuid/{user_uuid}/roles",
    dependencies=[Depends(require_permission("users.update"))],
)
async def update_user_roles(
    user_uuid: str,
    data: UserRolesUpdateRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Replace all roles for a user."""
    user = await _get_user_by_uuid(user_uuid, db)

    # Only a user with roles.assign_super_admin can assign the super_admin role
    if data.role_ids:
        sa_role_result = await db.execute(
            select(Role).where(Role.slug == settings.SUPER_ADMIN_ROLE_SLUG)
        )
        sa_role = sa_role_result.scalar_one_or_none()
        if sa_role and sa_role.id in data.role_ids:
            perms = await load_user_permissions(db, current_user.id)
            if not perms.get("roles.assign_super_admin"):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Permission requise: roles.assign_super_admin",
                )

    # Remove existing roles
    await db.execute(sa_delete(UserRole).where(UserRole.user_id == user.id))

    # Add new roles
    for role_id in data.role_ids:
        db.add(UserRole(user_id=user.id, role_id=role_id))

    await db.flush()
    invalidate_permission_cache(user.id)

    # Return updated roles
    result = await db.execute(
        select(Role).join(UserRole, UserRole.role_id == Role.id).where(UserRole.user_id == user.id)
    )
    return {"roles": [RoleBasic.model_validate(r).model_dump() for r in result.scalars().all()]}


@router.post(
    "/by-uuid/{user_uuid}/permissions/override",
    dependencies=[Depends(require_permission("users.update"))],
)
async def set_user_permission_override(
    user_uuid: str,
    data: UserPermissionOverrideRequest,
    db: AsyncSession = Depends(get_db),
):
    """Set or update a user permission override."""
    user = await _get_user_by_uuid(user_uuid, db)

    # Check permission exists
    result = await db.execute(select(Permission).where(Permission.id == data.permission_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Permission introuvable")

    # Upsert
    result = await db.execute(
        select(UserPermission).where(
            UserPermission.user_id == user.id,
            UserPermission.permission_id == data.permission_id,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.granted = data.granted
    else:
        db.add(UserPermission(user_id=user.id, permission_id=data.permission_id, granted=data.granted))

    await db.flush()
    invalidate_permission_cache(user.id)
    return {"permission_id": data.permission_id, "granted": data.granted}


@router.delete(
    "/by-uuid/{user_uuid}/permissions/override/{permission_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("users.update"))],
)
async def remove_user_permission_override(
    user_uuid: str,
    permission_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Remove a user permission override (revert to role/global resolution)."""
    user = await _get_user_by_uuid(user_uuid, db)

    result = await db.execute(
        select(UserPermission).where(
            UserPermission.user_id == user.id,
            UserPermission.permission_id == permission_id,
        )
    )
    override = result.scalar_one_or_none()
    if not override:
        raise HTTPException(status_code=404, detail="Override introuvable")

    await db.delete(override)
    await db.flush()
    invalidate_permission_cache(user.id)
