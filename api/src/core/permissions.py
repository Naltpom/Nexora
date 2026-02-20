"""Permission checking system with granular feature.action permissions."""

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .database import get_db
from .security import get_current_user


async def load_user_permissions(db: AsyncSession, user_id: int) -> dict[str, bool | None]:
    """
    Load the effective permission set for a user.

    Resolution order: user_permissions > role_permissions > global_permissions.
    Returns dict of {permission_code: True/False/None}.
    """
    from ._identity.models import (
        Permission,
        UserPermission,
        UserRole,
        RolePermission,
        GlobalPermission,
    )

    effective: dict[str, bool | None] = {}

    # 1. Global permissions
    result = await db.execute(
        select(Permission.code, GlobalPermission.granted).join(
            GlobalPermission, GlobalPermission.permission_id == Permission.id
        )
    )
    for code, granted in result.all():
        effective[code] = granted

    # 2. Role permissions (any role granting = True)
    result = await db.execute(
        select(Permission.code).distinct()
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .join(UserRole, UserRole.role_id == RolePermission.role_id)
        .where(UserRole.user_id == user_id)
    )
    for (code,) in result.all():
        effective[code] = True

    # 3. User-specific permissions (highest priority)
    result = await db.execute(
        select(Permission.code, UserPermission.granted).join(
            UserPermission, UserPermission.permission_id == Permission.id
        ).where(UserPermission.user_id == user_id)
    )
    for code, granted in result.all():
        effective[code] = granted

    return effective


def require_permission(*codes: str):
    """
    FastAPI dependency factory for checking permissions.

    Usage:
        @router.get("/", dependencies=[Depends(require_permission("notification.read"))])
    """

    async def checker(
        current_user=Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ):
        if current_user.is_super_admin:
            return current_user

        user_perms = await load_user_permissions(db, current_user.id)
        for code in codes:
            granted = user_perms.get(code)
            if granted is False:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission refusée: {code}",
                )
            if granted is not True:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission requise: {code}",
                )
        return current_user

    return checker


def require_feature(feature_name: str):
    """
    FastAPI dependency that checks if a feature is active.
    Used in dev mode when all routes are registered.
    """

    async def checker(request: Request):
        registry = request.app.state.feature_registry
        if not registry.is_active(feature_name):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Feature '{feature_name}' is disabled",
            )

    return checker


async def get_user_permission_codes(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[str]:
    """Return list of permission codes the current user has. Used by /auth/me endpoint."""
    if current_user.is_super_admin:
        from ._identity.models import Permission

        result = await db.execute(select(Permission.code))
        return [code for (code,) in result.all()]

    perms = await load_user_permissions(db, current_user.id)
    return [code for code, granted in perms.items() if granted is True]
