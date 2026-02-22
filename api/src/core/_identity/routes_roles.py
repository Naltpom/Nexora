"""Role CRUD + permission assignment endpoints."""

import math
import re

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..permissions import require_permission
from .models import Permission, Role, RolePermission, User, UserRole
from .schemas import (
    AssignPermissionsRequest,
    PermissionWithGranted,
    PermissionWithGrantedPaginated,
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

    role = Role(slug=slug, name=data.name, description=data.description)
    db.add(role)
    await db.flush()
    return _role_to_response(role, permission_codes=[])


@router.put(
    "/{role_id}",
    response_model=RoleResponse,
    dependencies=[Depends(require_permission("roles.update"))],
)
async def update_role(
    role_id: int,
    data: RoleUpdate,
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

    await db.flush()
    return _role_to_response(role)


@router.delete(
    "/{role_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("roles.delete"))],
)
async def delete_role(
    role_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Role).where(Role.id == role_id))
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Role introuvable")

    await db.delete(role)
    await db.flush()


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
    response_model=PermissionWithGrantedPaginated,
    dependencies=[Depends(require_permission("roles.read"))],
)
async def list_role_permissions_paginated(
    role_id: int,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
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

    # Build query
    query = select(Permission).order_by(Permission.feature, Permission.code)
    count_query = select(func.count(Permission.id))

    if search:
        search_filter = or_(
            Permission.code.ilike(f"%{search}%"),
            Permission.label.ilike(f"%{search}%"),
            Permission.description.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    # Count
    total = (await db.execute(count_query)).scalar() or 0
    pages = math.ceil(total / per_page) if total > 0 else 1

    # Paginate
    offset = (page - 1) * per_page
    result = await db.execute(query.offset(offset).limit(per_page))
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

    return PermissionWithGrantedPaginated(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=pages,
    )


@router.post(
    "/{role_id}/permissions/toggle",
    dependencies=[Depends(require_permission("roles.update"))],
)
async def toggle_role_permission(
    role_id: int,
    data: TogglePermissionRequest,
    db: AsyncSession = Depends(get_db),
):
    """Toggle a single permission on a role. Returns the new granted state."""
    result = await db.execute(select(Role).where(Role.id == role_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Role introuvable")

    result = await db.execute(select(Permission).where(Permission.id == data.permission_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Permission introuvable")

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
        await db.flush()
        return {"granted": False}
    else:
        db.add(RolePermission(role_id=role_id, permission_id=data.permission_id))
        await db.flush()
        return {"granted": True}


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
            is_super_admin=u.is_super_admin,
            must_change_password=u.must_change_password,
            last_login=u.last_login,
            last_active=u.last_active,
            created_at=u.created_at,
        )
        for u in users
    ]
