"""Tutorial seen-state management via user preferences + admin ordering."""

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from ..._identity.models import AppSetting, User
from ...database import get_db
from ...events import event_bus
from ...feature_registry import get_registry
from ...permissions import load_user_permissions, require_permission
from ...security import get_current_user
from .schemas import (
    FeatureTutorialResponse,
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


@router.get(
    "/seen",
    response_model=PermissionSeenResponse,
    dependencies=[Depends(require_permission("preference.didacticiel.read"))],
)
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
        flag_modified(user, "preferences")
        await db.flush()

    return PermissionSeenResponse(permissions_seen=permissions_seen)


@router.post(
    "/seen",
    dependencies=[Depends(require_permission("preference.didacticiel.read"))],
)
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
    flag_modified(user, "preferences")
    await db.flush()

    await event_bus.emit(
        "preference.updated",
        db=db,
        actor_id=current_user.id,
        resource_type="user",
        resource_id=current_user.id,
        payload={"keys": ["permissions_seen"], "permission": request.permission},
    )

    return {"ok": True}


@router.delete(
    "/seen",
    dependencies=[Depends(require_permission("preference.didacticiel.read"))],
)
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
    flag_modified(user, "preferences")
    await db.flush()

    await event_bus.emit(
        "preference.updated",
        db=db,
        actor_id=current_user.id,
        resource_type="user",
        resource_id=current_user.id,
        payload={"keys": ["permissions_seen"], "action": "reset"},
    )

    return {"ok": True}


# --- Admin ordering ---


@router.get(
    "/ordering",
    response_model=TutorialOrderingResponse,
    dependencies=[Depends(require_permission("preference.didacticiel.read"))],
)
async def get_tutorial_ordering(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
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

    await event_bus.emit(
        "preference.updated",
        db=db,
        actor_id=current_user.id,
        resource_type="app_setting",
        resource_id=0,
        payload={"keys": ["tutorial_ordering"]},
    )

    return {"ok": True}


# --- Tutorials (server-side filtered) ---


async def _load_ordering(db: AsyncSession) -> dict | None:
    """Load tutorial ordering from AppSetting, or None if not set."""
    result = await db.execute(
        select(AppSetting).where(AppSetting.key == ORDERING_KEY)
    )
    setting = result.scalar_one_or_none()
    if setting and setting.value:
        return json.loads(setting.value)
    return None


def _apply_ordering(tutorials: list[dict], ordering: dict) -> list[dict]:
    """Sort feature tutorials and their permission tutorials by admin ordering."""
    feature_order = ordering.get("feature_order", [])
    permission_order = ordering.get("permission_order", {})

    def feature_sort_key(ft: dict) -> int:
        try:
            return feature_order.index(ft["feature_name"])
        except ValueError:
            return 999

    result = sorted(tutorials, key=feature_sort_key)

    for ft in result:
        perm_order = permission_order.get(ft["feature_name"])
        if perm_order:

            def perm_sort_key(pt: dict, _order=perm_order) -> int:
                try:
                    return _order.index(pt["permission"])
                except ValueError:
                    return 999

            ft["permission_tutorials"] = sorted(ft["permission_tutorials"], key=perm_sort_key)

    return result


@router.get(
    "/tutorials",
    response_model=list[FeatureTutorialResponse],
    dependencies=[Depends(require_permission("preference.didacticiel.read"))],
)
async def get_tutorials(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get tutorials filtered by user permissions and sorted by admin ordering."""
    registry = get_registry()
    if not registry:
        return []

    all_tutorials = registry.collect_all_tutorials()
    user_perms = await load_user_permissions(db, current_user.id)

    # Filter permission tutorials by user's effective permissions
    result = []
    for ft in all_tutorials:
        filtered = [pt for pt in ft["permission_tutorials"] if user_perms.get(pt["permission"])]
        if filtered:
            result.append({**ft, "permission_tutorials": filtered})

    # Apply admin ordering
    ordering = await _load_ordering(db)
    if ordering:
        result = _apply_ordering(result, ordering)

    return [
        FeatureTutorialResponse(
            featureName=ft["feature_name"],
            label=ft["label"],
            description=ft.get("description"),
            permissionTutorials=ft["permission_tutorials"],
        )
        for ft in result
    ]
