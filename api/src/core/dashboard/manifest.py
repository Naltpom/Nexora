from ..feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="dashboard",
    label="Tableau de bord",
    description="Tableau de bord configurable avec widgets drag & drop",
    permissions=[
        "dashboard.read",
        "dashboard.manage",
    ],
    tutorial_order=5,
    router_module="src.core.dashboard.routes",
    router_prefix="/api/dashboard",
    router_tags=["Dashboard"],
)
