"""Tutorial seen-state management via user preferences + admin ordering."""

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...database import get_db
from ...permissions import require_permission
from ...security import get_current_user
from ..._identity.models import AppSetting, User
from .schemas import (
    PermissionSeenRequest,
    PermissionSeenResponse,
    TutorialOrderingResponse,
    TutorialOrderingUpdate,
)

router = APIRouter()

ORDERING_KEY = "tutorial_ordering"

# Legacy migration map: old tutorial_id -> permission code
_MIGRATION_MAP = {
    "notification.overview": "notification.read",
}


def _parse_prefs(user) -> dict:
    return user.preferences or {}


def _migrate_legacy(prefs: dict) -> dict[str, str]:
    """Migrate old tutorials_seen to permissions_seen if needed."""
    permissions_seen = prefs.get("permissions_seen", {})
    legacy = prefs.get("tutorials_seen")
    if legacy and not permissions_seen:
        for old_id, timestamp in legacy.items():
            new_perm = _MIGRATION_MAP.get(old_id)
            if new_perm:
                permissions_seen[new_perm] = timestamp
    return permissions_seen


@router.get("/seen", response_model=PermissionSeenResponse)
async def get_seen_permissions(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all seen permission tutorial timestamps."""
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one()

    prefs = _parse_prefs(user)
    permissions_seen = _migrate_legacy(prefs)

    # Persist migration if legacy data was present
    if prefs.get("tutorials_seen") and permissions_seen:
        prefs["permissions_seen"] = permissions_seen
        prefs.pop("tutorials_seen", None)
        user.preferences = prefs
        await db.flush()

    return PermissionSeenResponse(permissions_seen=permissions_seen)


@router.post("/seen")
async def mark_permission_seen(
    request: PermissionSeenRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark a permission tutorial as seen."""
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one()

    existing = _parse_prefs(user)
    permissions_seen = existing.get("permissions_seen", {})
    permissions_seen[request.permission] = datetime.now(timezone.utc).isoformat()
    existing["permissions_seen"] = permissions_seen
    existing.pop("tutorials_seen", None)
    user.preferences = existing
    await db.flush()
    return {"ok": True}


@router.delete("/seen")
async def reset_all_tutorials(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Reset all tutorial seen states."""
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one()

    existing = _parse_prefs(user)
    existing.pop("permissions_seen", None)
    existing.pop("tutorials_seen", None)
    user.preferences = existing
    await db.flush()
    return {"ok": True}


# --- Admin ordering ---


@router.get("/ordering", response_model=TutorialOrderingResponse)
async def get_tutorial_ordering(db: AsyncSession = Depends(get_db)):
    """Get tutorial ordering configuration."""
    result = await db.execute(
        select(AppSetting).where(AppSetting.key == ORDERING_KEY)
    )
    setting = result.scalar_one_or_none()
    if setting and setting.value:
        data = json.loads(setting.value)
        return TutorialOrderingResponse(**data)
    return TutorialOrderingResponse(feature_order=[], permission_order={})


@router.put(
    "/ordering",
    dependencies=[Depends(require_permission("preference.didacticiel.manage"))],
)
async def update_tutorial_ordering(
    data: TutorialOrderingUpdate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update tutorial ordering (admin only)."""
    result = await db.execute(
        select(AppSetting).where(AppSetting.key == ORDERING_KEY)
    )
    existing = result.scalar_one_or_none()
    value = json.dumps(data.model_dump())
    now = datetime.now(timezone.utc)
    if existing:
        existing.value = value
        existing.updated_at = now
        existing.updated_by = current_user.id
    else:
        db.add(
            AppSetting(
                key=ORDERING_KEY,
                value=value,
                updated_at=now,
                updated_by=current_user.id,
            )
        )
    await db.flush()
    return {"ok": True}
