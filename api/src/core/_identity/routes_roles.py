"""Role CRUD + permission assignment endpoints."""

import re

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..events import event_bus
from ..pagination import PaginatedResponse, PaginationParams, paginate, search_like_pattern
from ..permissions import invalidate_permission_cache, require_permission
from ..realtime.services import sse_broadcaster
from ..security import get_current_user
from .models import Permission, Role, RolePermission, User, UserRole
from .schemas import (
    AssignPermissionsRequest,
    PermissionWithGranted,
    RoleCreate,
    RoleResponse,
    RoleUpdate,
    TogglePermissionRequest,
    UserResponse,
)

router = APIRouter()


def _slugify(name: str) -> str:
    """Convert a display name to a slug (lowercase, underscores, ascii)."""
    slug = name.lower().strip()
    slug = re.sub(r"[àâä]", "a", slug)
    slug = re.sub(r"[éèêë]", "e", slug)
    slug = re.sub(r"[îï]", "i", slug)
    slug = re.sub(r"[ôö]", "o", slug)
    slug = re.sub(r"[ùûü]", "u", slug)
    slug = re.sub(r"[ç]", "c", slug)
    slug = re.sub(r"[^a-z0-9]+", "_", slug)
    return slug.strip("_")


def _role_to_response(role: Role, permission_codes: list[str] | None = None) -> RoleResponse:
    codes = permission_codes if permission_codes is not None else [
        p.code for p in role.permissions
    ]
    return RoleResponse(
        id=role.id,
        slug=role.slug,
        name=role.name,
        description=role.description,
        color=role.color,
        permissions=codes,
        created_at=role.created_at,
        updated_at=role.updated_at,
    )


# ---------------------------------------------------------------------------
#  CRUD
# ---------------------------------------------------------------------------


@router.get(
    "/",
    response_model=list[RoleResponse],
    dependencies=[Depends(require_permission("roles.read"))],
)
async def list_roles(db: AsyncSession = Depends(get_db)):
    """List all roles with their permission codes."""
    result = await db.execute(
        select(Role).options(selectinload(Role.permissions)).order_by(Role.slug)
    )
    roles = result.scalars().unique().all()
    return [_role_to_response(r) for r in roles]


@router.post(
    "/",
    response_model=RoleResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("roles.create"))],
)
async def create_role(
    data: RoleCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Check name uniqueness
    result = await db.execute(select(Role).where(Role.name == data.name))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Un role avec ce nom existe deja")

    # Generate or validate slug
    slug = data.slug if data.slug else _slugify(data.name)
    result = await db.execute(select(Role).where(Role.slug == slug))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Un role avec ce slug existe deja")

    role = Role(slug=slug, name=data.name, description=data.description, color=data.color)
    db.add(role)
    await db.flush()

    await event_bus.emit(
        "role.created",
        db=db,
        actor_id=current_user.id,
        resource_type="role",
        resource_id=role.id,
        payload={"slug": role.slug, "name": role.name},
    )
    return _role_to_response(role, permission_codes=[])


@router.put(
    "/{role_id}",
    response_model=RoleResponse,
    dependencies=[Depends(require_permission("roles.update"))],
)
async def update_role(
    role_id: int,
    data: RoleUpdate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Role).options(selectinload(Role.permissions)).where(Role.id == role_id)
    )
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Role introuvable")

    if data.name is not None:
        # Check uniqueness
        existing = await db.execute(
            select(Role).where(Role.name == data.name, Role.id != role_id)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Un role avec ce nom existe deja")
        role.name = data.name
    if data.description is not None:
        role.description = data.description
    if data.color is not None:
        role.color = data.color

    await db.flush()

    await event_bus.emit(
        "role.updated",
        db=db,
        actor_id=current_user.id,
        resource_type="role",
        resource_id=role.id,
        payload={"slug": role.slug, "name": role.name},
    )
    return _role_to_response(role)


@router.delete(
    "/{role_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("roles.delete"))],
)
async def delete_role(
    role_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Role).where(Role.id == role_id))
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Role introuvable")

    PROTECTED_ROLE_SLUGS = {"super_admin", "admin", "user"}
    if role.slug in PROTECTED_ROLE_SLUGS:
        raise HTTPException(status_code=403, detail="Impossible de supprimer un role systeme")

    role_slug = role.slug
    role_name = role.name
    await db.delete(role)
    await db.flush()
    invalidate_permission_cache()  # Role deletion affects all users with this role

    await event_bus.emit(
        "role.deleted",
        db=db,
        actor_id=current_user.id,
        resource_type="role",
        resource_id=role_id,
        payload={"slug": role_slug, "name": role_name},
    )


# ---------------------------------------------------------------------------
#  Permission assignment
# ---------------------------------------------------------------------------


@router.post(
    "/{role_id}/permissions",
    response_model=RoleResponse,
    dependencies=[Depends(require_permission("roles.update"))],
)
async def assign_permissions(
    role_id: int,
    data: AssignPermissionsRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Replace the permission set on a role with the supplied list of permission IDs."""
    result = await db.execute(select(Role).where(Role.id == role_id))
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Role introuvable")

    # Validate all permission IDs exist
    result = await db.execute(
        select(Permission).where(Permission.id.in_(data.permission_ids))
    )
    permissions = result.scalars().all()
    found_ids = {p.id for p in permissions}
    missing = set(data.permission_ids) - found_ids
    if missing:
        raise HTTPException(status_code=400, detail=f"Permission(s) introuvable(s): {missing}")

    # Block permissions that cannot be assigned to roles (assignment_rules.role=false)
    role_blocked = [p for p in permissions if not p.assignment_rules.get("role", True)]
    if role_blocked:
        codes = ", ".join(p.code for p in role_blocked)
        raise HTTPException(status_code=400, detail=f"Permission(s) assignable(s) uniquement par utilisateur : {codes}")

    # Remove existing role permissions
    result = await db.execute(
        select(RolePermission).where(RolePermission.role_id == role_id)
    )
    for rp in result.scalars().all():
        await db.delete(rp)

    # Add new ones
    for pid in data.permission_ids:
        db.add(RolePermission(role_id=role_id, permission_id=pid))
    await db.flush()
    invalidate_permission_cache()  # Role permission change affects all users with this role

    await event_bus.emit(
        "role.permissions_updated",
        db=db,
        actor_id=current_user.id,
        resource_type="role",
        resource_id=role_id,
        payload={"permission_ids": data.permission_ids, "count": len(data.permission_ids)},
    )

    # Notify affected users via realtime SSE
    user_role_result = await db.execute(
        select(UserRole.user_id).where(UserRole.role_id == role_id)
    )
    for row in user_role_result.all():
        await sse_broadcaster.push(
            row[0], event_type="permission_change", data={"reason": "role_permissions_updated"},
        )

    # Reload with permissions
    result = await db.execute(
        select(Role).options(selectinload(Role.permissions)).where(Role.id == role_id)
    )
    role = result.scalar_one()
    return _role_to_response(role)


# ---------------------------------------------------------------------------
#  Paginated permissions for a role (with granted status)
# ---------------------------------------------------------------------------


@router.get(
    "/{role_id}/permissions/all",
    response_model=PaginatedResponse[PermissionWithGranted],
    dependencies=[Depends(require_permission("roles.read"))],
)
async def list_role_permissions_paginated(
    role_id: int,
    pagination: PaginationParams = Depends(PaginationParams(default_per_page=20)),
    db: AsyncSession = Depends(get_db),
):
    """List all permissions with granted status for a role, paginated."""
    result = await db.execute(select(Role).where(Role.id == role_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Role introuvable")

    # Get granted permission IDs for this role
    rp_result = await db.execute(
        select(RolePermission.permission_id).where(RolePermission.role_id == role_id)
    )
    granted_ids = {row[0] for row in rp_result.all()}

    # Build query — exclude permissions not assignable to roles (assignment_rules.role=false)
    role_filter = Permission.assignment_rules["role"].as_boolean() == True  # noqa: E712
    query = select(Permission).where(role_filter).order_by(Permission.feature, Permission.code)

    if pagination.search:
        like = search_like_pattern(pagination.search)
        search_filter = or_(
            Permission.code.ilike(like),
            Permission.label.ilike(like),
            Permission.description.ilike(like),
        )
        query = query.where(search_filter)

    result, total, pages = await paginate(db, query, pagination)
    permissions = result.scalars().all()

    items = [
        PermissionWithGranted(
            id=p.id,
            code=p.code,
            feature=p.feature,
            label=p.label,
            description=p.description,
            granted=p.id in granted_ids,
        )
        for p in permissions
    ]

    return PaginatedResponse(
        items=items,
        total=total,
        page=pagination.page,
        per_page=pagination.per_page,
        pages=pages,
    )


@router.post(
    "/{role_id}/permissions/toggle",
    dependencies=[Depends(require_permission("roles.update"))],
)
async def toggle_role_permission(
    role_id: int,
    data: TogglePermissionRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Toggle a single permission on a role. Returns the new granted state."""
    result = await db.execute(select(Role).where(Role.id == role_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Role introuvable")

    result = await db.execute(select(Permission).where(Permission.id == data.permission_id))
    perm = result.scalar_one_or_none()
    if not perm:
        raise HTTPException(status_code=404, detail="Permission introuvable")

    # Block permissions that cannot be assigned to roles (assignment_rules.role=false)
    if not perm.assignment_rules.get("role", True):
        raise HTTPException(status_code=400, detail=f"Permission assignable uniquement par utilisateur : {perm.code}")

    # Check if already assigned
    result = await db.execute(
        select(RolePermission).where(
            RolePermission.role_id == role_id,
            RolePermission.permission_id == data.permission_id,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        await db.delete(existing)
        granted = False
    else:
        db.add(RolePermission(role_id=role_id, permission_id=data.permission_id))
        granted = True

    await db.flush()
    invalidate_permission_cache()

    await event_bus.emit(
        "role.permissions_updated",
        db=db,
        actor_id=current_user.id,
        resource_type="role",
        resource_id=role_id,
        payload={"permission_id": data.permission_id, "granted": granted},
    )

    # Notify affected users via realtime SSE
    user_role_result = await db.execute(
        select(UserRole.user_id).where(UserRole.role_id == role_id)
    )
    for row in user_role_result.all():
        await sse_broadcaster.push(
            row[0], event_type="permission_change", data={"reason": "role_permissions_updated"},
        )

    return {"granted": granted}


# ---------------------------------------------------------------------------
#  Users with role
# ---------------------------------------------------------------------------


@router.get(
    "/{role_id}/users",
    response_model=list[UserResponse],
    dependencies=[Depends(require_permission("roles.read"))],
)
async def list_role_users(
    role_id: int,
    db: AsyncSession = Depends(get_db),
):
    """List users that have the given role."""
    result = await db.execute(select(Role).where(Role.id == role_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Role introuvable")

    result = await db.execute(
        select(User)
        .join(UserRole, UserRole.user_id == User.id)
        .where(UserRole.role_id == role_id)
        .order_by(User.email)
    )
    users = result.scalars().all()

    return [
        UserResponse(
            id=u.id,
            email=u.email,
            first_name=u.first_name,
            last_name=u.last_name,
            auth_source=u.auth_source,
            is_active=u.is_active,
            must_change_password=u.must_change_password,
            last_login=u.last_login,
            last_active=u.last_active,
            created_at=u.created_at,
        )
        for u in users
    ]
