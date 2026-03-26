from ..feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="exports",
    label="Exports",
    description="Centre d'exports : agrege les exports disponibles depuis toutes les features",
    permissions=["exports.read", "exports.history"],
    router_module="src.core.exports.routes",
    router_prefix="/api/exports",
    router_tags=["Exports"],
    events=[
        {
            "event_type": "exports.ready",
            "label": "Export termine",
            "category": "Exports",
            "description": "Un export asynchrone a termine sa generation (succes ou erreur)",
        },
    ],
)
