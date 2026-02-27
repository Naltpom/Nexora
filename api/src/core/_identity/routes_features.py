"""Feature listing, toggling, and manifest endpoint."""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..events import event_bus
from ..permissions import require_permission
from ..realtime.services import sse_broadcaster
from ..security import get_current_user
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

    # Build list of features to update (cascade children on deactivation)
    names_to_toggle = [name]
    if not data.active:
        names_to_toggle.extend(registry.get_cascade_deactivations(name))

    # Persist state to DB + update in-memory for each feature
    for fname in names_to_toggle:
        result = await db.execute(select(FeatureState).where(FeatureState.name == fname))
        state = result.scalar_one_or_none()

        if state:
            state.is_active = data.active
            state.updated_by = current_user.id
        else:
            db.add(FeatureState(name=fname, is_active=data.active, updated_by=current_user.id))

        registry.toggle(fname, data.active)

    await db.flush()

    await event_bus.emit(
        "admin.feature_toggled",
        db=db,
        actor_id=current_user.id,
        resource_type="feature",
        resource_id=0,
        payload={"feature": name, "active": data.active, "cascaded": names_to_toggle[1:], "toggled_by": current_user.email},
    )

    # Broadcast feature toggle to all connected users via realtime SSE
    await sse_broadcaster.broadcast_all(
        event_type="feature_toggle",
        data={"feature": name, "active": data.active, "cascaded": names_to_toggle[1:]},
    )

    return {"name": name, "active": data.active, "cascaded": names_to_toggle[1:]}


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
