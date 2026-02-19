"""Role CRUD + permission assignment endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ...core.database import get_db
from ...core.permissions import require_permission
from .models import Permission, Role, RolePermission, UserRole, User
from .schemas import (
    AssignPermissionsRequest,
    RoleCreate,
    RoleResponse,
    RoleUpdate,
    UserResponse,
)

router = APIRouter()


def _role_to_response(role: Role, permission_codes: list[str] | None = None) -> RoleResponse:
    codes = permission_codes if permission_codes is not None else [
        p.code for p in role.permissions
    ]
    return RoleResponse(
        id=role.id,
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
        select(Role).options(selectinload(Role.permissions)).order_by(Role.name)
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
    result = await db.execute(select(Role).where(Role.name == data.name))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Un role avec ce nom existe deja")

    role = Role(name=data.name, description=data.description)
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
