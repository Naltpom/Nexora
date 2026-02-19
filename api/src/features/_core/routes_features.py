"""Feature listing, toggling, and manifest endpoint."""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_db
from ...core.permissions import require_permission
from ...core.security import get_current_user
from .models import FeatureState
from .schemas import FeatureResponse, FeatureToggleRequest

router = APIRouter()


def _get_registry(request: Request):
    """Retrieve the FeatureRegistry instance from app state."""
    return request.app.state.feature_registry


# ---------------------------------------------------------------------------
#  List features
# ---------------------------------------------------------------------------


@router.get(
    "/",
    response_model=list[FeatureResponse],
    dependencies=[Depends(require_permission("features.read"))],
)
async def list_features(request: Request):
    """List all features with their current state."""
    registry = _get_registry(request)
    data = registry.get_manifest_data_for_frontend()
    return [FeatureResponse(**item) for item in data]


# ---------------------------------------------------------------------------
#  Frontend manifest (public)
# ---------------------------------------------------------------------------


@router.get("/manifest")
async def get_manifest(request: Request):
    """Public endpoint returning feature data for the frontend.

    Returns active features with their metadata so the frontend can
    conditionally render UI sections.
    """
    registry = _get_registry(request)
    return registry.get_manifest_data_for_frontend()


# ---------------------------------------------------------------------------
#  Toggle feature
# ---------------------------------------------------------------------------


@router.put(
    "/{name}/toggle",
    dependencies=[Depends(require_permission("features.manage"))],
)
async def toggle_feature(
    name: str,
    data: FeatureToggleRequest,
    request: Request,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Enable or disable a feature."""
    registry = _get_registry(request)

    ok, reason = registry.can_toggle(name, data.active)
    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=reason)

    # Persist state to DB
    result = await db.execute(select(FeatureState).where(FeatureState.name == name))
    state = result.scalar_one_or_none()

    if state:
        state.is_active = data.active
        state.updated_by = current_user.id
    else:
        db.add(FeatureState(name=name, is_active=data.active, updated_by=current_user.id))

    await db.flush()

    # Update in-memory state
    registry.toggle(name, data.active)

    return {"name": name, "active": data.active}


# ---------------------------------------------------------------------------
#  Dependency graph
# ---------------------------------------------------------------------------


@router.get(
    "/graph",
    dependencies=[Depends(require_permission("features.read"))],
)
async def get_dependency_graph(request: Request):
    """Return the feature dependency graph for visualization.

    Returns a structure with nodes (features) and edges (dependencies / parent
    relationships) that a frontend graph library can consume.
    """
    registry = _get_registry(request)
    manifests = registry.get_all_manifests()

    nodes = []
    edges = []

    for manifest in manifests:
        nodes.append({
            "id": manifest.name,
            "label": manifest.label,
            "is_core": manifest.is_core,
            "active": registry.is_active(manifest.name),
            "version": manifest.version,
        })

        # Parent relationship
        if manifest.parent:
            edges.append({
                "source": manifest.parent,
                "target": manifest.name,
                "type": "parent",
            })

        # Dependency relationships
        for dep in manifest.depends:
            edges.append({
                "source": dep,
                "target": manifest.name,
                "type": "depends",
            })

    return {"nodes": nodes, "edges": edges}
