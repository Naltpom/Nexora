from ..feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="dashboard",
    label="Tableau de bord",
    description="Tableau de bord configurable avec widgets drag & drop",
    permissions=[
        "dashboard.read",
        "dashboard.create",
        "dashboard.update",
        "dashboard.delete",
    ],
    events=[
        {"event_type": "dashboard.defaults.updated", "label": "Layout par defaut modifie", "category": "Dashboard", "description": "Le layout par defaut d'un role a ete modifie"},
        {"event_type": "dashboard.defaults.deleted", "label": "Layout par defaut supprime", "category": "Dashboard", "description": "Le layout par defaut d'un role a ete supprime"},
    ],
    tutorial_order=5,
    router_module="src.core.dashboard.routes",
    router_prefix="/api/dashboard",
    router_tags=["Dashboard"],
)
