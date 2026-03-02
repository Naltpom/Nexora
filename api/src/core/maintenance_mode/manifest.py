from ..feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="maintenance_mode",
    label="Mode Maintenance",
    description="Page maintenance dediee, bypass admins, planification automatique",
    depends=["realtime"],
    permissions=[
        "maintenance_mode.read",
        "maintenance_mode.manage",
    ],
    events=[
        {
            "event_type": "maintenance_mode.activated",
            "label": "Maintenance activee",
            "category": "Maintenance",
            "description": "Le mode maintenance a ete active",
        },
        {
            "event_type": "maintenance_mode.deactivated",
            "label": "Maintenance desactivee",
            "category": "Maintenance",
            "description": "Le mode maintenance a ete desactive",
        },
        {
            "event_type": "maintenance_mode.scheduled",
            "label": "Maintenance planifiee",
            "category": "Maintenance",
            "description": "Une fenetre de maintenance a ete planifiee",
        },
    ],
    router_module="src.core.maintenance_mode.routes",
    router_prefix="/api/maintenance",
    router_tags=["Maintenance"],
)
