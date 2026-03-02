"""Dashboard feature routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..permissions import require_permission
from ..security import get_current_user
from .schemas import (
    LayoutResponse,
    LayoutSave,
    SystemHealthData,
    WidgetConfig,
    WidgetDefinitionResponse,
)
from .services import (
    delete_default_layout,
    delete_user_layout,
    get_activity_feed,
    get_default_layout,
    get_stats_events,
    get_stats_invitations,
    get_stats_notifications,
    get_stats_users,
    get_system_health,
    get_user_layout,
    save_default_layout,
    save_user_layout,
)
from .widget_registry import widget_registry

router = APIRouter()


# ── Helpers ──────────────────────────────────────────────────────────────


async def _get_user_role_slugs(db: AsyncSession, user_id: int) -> list[str]:
    from sqlalchemy import select

    from .._identity.models import Role, UserRole
    result = await db.execute(
        select(Role.slug).join(UserRole, UserRole.role_id == Role.id).where(
            UserRole.user_id == user_id,
        )
    )
    return [row[0] for row in result.all()]


async def _get_user_perms(db: AsyncSession, user_id: int) -> dict[str, bool | None]:
    from ..permissions import load_user_permissions
    return await load_user_permissions(db, user_id)


async def _get_active_features() -> set[str]:
    from ..feature_registry import get_registry
    registry = get_registry()
    if not registry:
        return set()
    return {m.name for m in registry.get_active_manifests()}


# ── User layout ──────────────────────────────────────────────────────────


@router.get(
    "/layout",
    response_model=LayoutResponse,
    dependencies=[Depends(require_permission("dashboard.read"))],
)
async def get_layout(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the current user's dashboard layout (resolved: user -> role -> default)."""
    role_slugs = await _get_user_role_slugs(db, current_user.id)
    widgets, source = await get_user_layout(db, current_user.id, role_slugs)
    return LayoutResponse(
        widgets=[WidgetConfig(**w) for w in widgets],
        source=source,
    )


@router.put(
    "/layout",
    dependencies=[Depends(require_permission("dashboard.read"))],
)
async def save_layout(
    data: LayoutSave,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Save the current user's personal dashboard layout."""
    await save_user_layout(db, current_user.id, [w.model_dump() for w in data.widgets])
    return {"ok": True}


@router.delete(
    "/layout",
    dependencies=[Depends(require_permission("dashboard.read"))],
)
async def reset_layout(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Reset the current user's layout to default."""
    found = await delete_user_layout(db, current_user.id)
    if not found:
        return {"ok": True, "message": "No custom layout to reset"}
    return {"ok": True}


# ── Available widgets ────────────────────────────────────────────────────


@router.get(
    "/widgets",
    response_model=list[WidgetDefinitionResponse],
    dependencies=[Depends(require_permission("dashboard.read"))],
)
async def list_widgets(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List widgets available to the current user."""
    user_perms = await _get_user_perms(db, current_user.id)
    active_features = await _get_active_features()
    available = widget_registry.get_available(user_perms, active_features)
    return [
        WidgetDefinitionResponse(
            id=w.id,
            label=w.label,
            description=w.description,
            category=w.category,
            default_size=w.default_size,
            data_endpoint=w.data_endpoint,
        )
        for w in available
    ]


# ── Widget data endpoints ────────────────────────────────────────────────


@router.get(
    "/widgets/stats/users",
    dependencies=[Depends(require_permission("users.read"))],
)
async def stats_users(db: AsyncSession = Depends(get_db)):
    return await get_stats_users(db)


@router.get(
    "/widgets/stats/notifications",
    dependencies=[Depends(require_permission("dashboard.read"))],
)
async def stats_notifications(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_stats_notifications(db, current_user.id)


@router.get(
    "/widgets/stats/invitations",
    dependencies=[Depends(require_permission("invitations.read"))],
)
async def stats_invitations(db: AsyncSession = Depends(get_db)):
    return await get_stats_invitations(db)


@router.get(
    "/widgets/stats/events",
    dependencies=[Depends(require_permission("event.read"))],
)
async def stats_events(db: AsyncSession = Depends(get_db)):
    return await get_stats_events(db)


@router.get(
    "/widgets/activity",
    dependencies=[Depends(require_permission("event.read"))],
)
async def activity(db: AsyncSession = Depends(get_db)):
    items = await get_activity_feed(db)
    return items


@router.get(
    "/widgets/system-health",
    response_model=SystemHealthData,
    dependencies=[Depends(require_permission("settings.read"))],
)
async def system_health(db: AsyncSession = Depends(get_db)):
    return await get_system_health(db)


# ── Admin default layouts ────────────────────────────────────────────────


@router.get(
    "/defaults/{role_slug}",
    response_model=LayoutResponse,
    dependencies=[Depends(require_permission("dashboard.manage"))],
)
async def get_default(
    role_slug: str,
    db: AsyncSession = Depends(get_db),
):
    """Get the default layout for a role."""
    slug = None if role_slug == "__global__" else role_slug
    layout = await get_default_layout(db, slug)
    if not layout:
        raise HTTPException(status_code=404, detail="No default layout found")
    return LayoutResponse(
        widgets=[WidgetConfig(**w) for w in layout.widgets],
        source="role" if slug else "default",
    )


@router.put(
    "/defaults/{role_slug}",
    dependencies=[Depends(require_permission("dashboard.manage"))],
)
async def save_default(
    role_slug: str,
    data: LayoutSave,
    db: AsyncSession = Depends(get_db),
):
    """Save the default layout for a role."""
    slug = None if role_slug == "__global__" else role_slug
    await save_default_layout(db, slug, [w.model_dump() for w in data.widgets])
    return {"ok": True}


@router.delete(
    "/defaults/{role_slug}",
    dependencies=[Depends(require_permission("dashboard.manage"))],
)
async def delete_default(
    role_slug: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete the default layout for a role."""
    slug = None if role_slug == "__global__" else role_slug
    found = await delete_default_layout(db, slug)
    if not found:
        raise HTTPException(status_code=404, detail="No default layout found")
    return {"ok": True}
