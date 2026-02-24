"""Permission listing, global permissions, and user permission overrides."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..events import event_bus
from ..permissions import invalidate_permission_cache, require_permission
from ..security import get_current_user
from .models import (
    GlobalPermission,
    Permission,
    Role,
    UserPermission,
    UserRole,
)
from .schemas import (
    GlobalPermissionSet,
    PermissionResponse,
    RoleResponse,
    UserPermissionOverride,
)

router = APIRouter()


# ---------------------------------------------------------------------------
#  Permission listing
# ---------------------------------------------------------------------------


@router.get(
    "/",
    response_model=list[PermissionResponse],
    dependencies=[Depends(require_permission("permissions.read"))],
)
async def list_permissions(
    feature: str | None = Query(None, description="Filter by feature name"),
    db: AsyncSession = Depends(get_db),
):
    """List all permissions, optionally filtered by feature."""
    query = select(Permission).order_by(Permission.feature, Permission.code)
    if feature:
        query = query.where(Permission.feature == feature)
    result = await db.execute(query)
    return [PermissionResponse.model_validate(p) for p in result.scalars().all()]


# ---------------------------------------------------------------------------
#  Global permissions
# ---------------------------------------------------------------------------


@router.get(
    "/global",
    dependencies=[Depends(require_permission("permissions.manage"))],
)
async def list_global_permissions(db: AsyncSession = Depends(get_db)):
    """List global permission settings."""
    result = await db.execute(
        select(GlobalPermission, Permission)
        .join(Permission, Permission.id == GlobalPermission.permission_id)
        .order_by(Permission.code)
    )
    rows = result.all()
    return [
        {
            "permission_id": gp.permission_id,
            "code": perm.code,
            "feature": perm.feature,
            "label": perm.label,
            "granted": gp.granted,
        }
        for gp, perm in rows
    ]


@router.post(
    "/global",
    dependencies=[Depends(require_permission("permissions.manage"))],
)
async def set_global_permission(
    data: GlobalPermissionSet,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Set a global permission (upsert)."""
    # Validate permission exists
    result = await db.execute(select(Permission).where(Permission.id == data.permission_id))
    perm = result.scalar_one_or_none()
    if not perm:
        raise HTTPException(status_code=404, detail="Permission introuvable")

    # Block permissions that cannot be set globally (assignment_rules.global=false)
    if not perm.assignment_rules.get("global", True):
        raise HTTPException(status_code=400, detail=f"Permission assignable uniquement par utilisateur : {perm.code}")

    result = await db.execute(
        select(GlobalPermission).where(GlobalPermission.permission_id == data.permission_id)
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.granted = data.granted
    else:
        db.add(GlobalPermission(permission_id=data.permission_id, granted=data.granted))

    await db.flush()
    invalidate_permission_cache()  # Global permission change affects all users

    await event_bus.emit(
        "admin.global_permissions_updated",
        db=db,
        actor_id=current_user.id,
        resource_type="permission",
        resource_id=data.permission_id,
        payload={"code": perm.code, "granted": data.granted, "updated_by": current_user.email},
    )

    return {"permission_id": data.permission_id, "code": perm.code, "granted": data.granted}


@router.delete(
    "/global/{permission_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("permissions.manage"))],
)
async def remove_global_permission(
    permission_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Remove a global permission setting."""
    result = await db.execute(
        select(GlobalPermission).where(GlobalPermission.permission_id == permission_id)
    )
    gp = result.scalar_one_or_none()
    if not gp:
        raise HTTPException(status_code=404, detail="Permission globale introuvable")
    await db.delete(gp)
    await db.flush()
    invalidate_permission_cache()  # Global permission change affects all users


# ---------------------------------------------------------------------------
#  User permission overrides
# ---------------------------------------------------------------------------


@router.get(
    "/users/{user_id}",
    dependencies=[Depends(require_permission("permissions.manage"))],
)
async def list_user_permissions(
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    """List user-specific permission overrides."""
    result = await db.execute(
        select(UserPermission, Permission)
        .join(Permission, Permission.id == UserPermission.permission_id)
        .where(UserPermission.user_id == user_id)
        .order_by(Permission.code)
    )
    rows = result.all()
    return [
        {
            "permission_id": up.permission_id,
            "code": perm.code,
            "feature": perm.feature,
            "label": perm.label,
            "granted": up.granted,
        }
        for up, perm in rows
    ]


@router.post(
    "/users/{user_id}",
    dependencies=[Depends(require_permission("permissions.manage"))],
)
async def set_user_permission(
    user_id: int,
    data: UserPermissionOverride,
    db: AsyncSession = Depends(get_db),
):
    """Set a user permission override (upsert)."""
    # Validate permission exists
    result = await db.execute(select(Permission).where(Permission.id == data.permission_id))
    perm = result.scalar_one_or_none()
    if not perm:
        raise HTTPException(status_code=404, detail="Permission introuvable")

    result = await db.execute(
        select(UserPermission).where(
            UserPermission.user_id == user_id,
            UserPermission.permission_id == data.permission_id,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.granted = data.granted
    else:
        db.add(UserPermission(user_id=user_id, permission_id=data.permission_id, granted=data.granted))

    await db.flush()
    invalidate_permission_cache(user_id)
    return {"user_id": user_id, "permission_id": data.permission_id, "code": perm.code, "granted": data.granted}


@router.delete(
    "/users/{user_id}/{permission_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("permissions.manage"))],
)
async def remove_user_permission(
    user_id: int,
    permission_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Remove a user permission override."""
    result = await db.execute(
        select(UserPermission).where(
            UserPermission.user_id == user_id,
            UserPermission.permission_id == permission_id,
        )
    )
    up = result.scalar_one_or_none()
    if not up:
        raise HTTPException(status_code=404, detail="Permission utilisateur introuvable")
    await db.delete(up)
    await db.flush()
    invalidate_permission_cache(user_id)


# ---------------------------------------------------------------------------
#  User roles
# ---------------------------------------------------------------------------


@router.post(
    "/users/{user_id}/roles",
    dependencies=[Depends(require_permission("permissions.manage"))],
)
async def assign_roles_to_user(
    user_id: int,
    role_ids: list[int],
    db: AsyncSession = Depends(get_db),
):
    """Replace the role set for a user with the supplied list of role IDs."""
    # Validate roles exist
    result = await db.execute(select(Role).where(Role.id.in_(role_ids)))
    found_ids = {r.id for r in result.scalars().all()}
    missing = set(role_ids) - found_ids
    if missing:
        raise HTTPException(status_code=400, detail=f"Role(s) introuvable(s): {missing}")

    # Remove existing user roles
    result = await db.execute(select(UserRole).where(UserRole.user_id == user_id))
    for ur in result.scalars().all():
        await db.delete(ur)

    # Add new ones
    for rid in role_ids:
        db.add(UserRole(user_id=user_id, role_id=rid))
    await db.flush()
    invalidate_permission_cache(user_id)

    return {"user_id": user_id, "role_ids": role_ids}


@router.get(
    "/users/{user_id}/roles",
    response_model=list[RoleResponse],
    dependencies=[Depends(require_permission("permissions.read"))],
)
async def list_user_roles(
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    """List roles assigned to a user."""
    from sqlalchemy.orm import selectinload

    result = await db.execute(
        select(Role)
        .options(selectinload(Role.permissions))
        .join(UserRole, UserRole.role_id == Role.id)
        .where(UserRole.user_id == user_id)
        .order_by(Role.name)
    )
    roles = result.scalars().unique().all()

    return [
        RoleResponse(
            id=r.id,
            name=r.name,
            description=r.description,
            permissions=[p.code for p in r.permissions],
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in roles
    ]


@router.delete(
    "/users/{user_id}/roles/{role_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("permissions.manage"))],
)
async def remove_role_from_user(
    user_id: int,
    role_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Remove a specific role from a user."""
    result = await db.execute(
        select(UserRole).where(UserRole.user_id == user_id, UserRole.role_id == role_id)
    )
    ur = result.scalar_one_or_none()
    if not ur:
        raise HTTPException(status_code=404, detail="Role utilisateur introuvable")
    await db.delete(ur)
    await db.flush()
    invalidate_permission_cache(user_id)
