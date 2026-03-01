from ..feature_registry import FeatureManifest

# Subscribe to the event bus for persistence.
from . import event_handlers  # noqa: F401

manifest = FeatureManifest(
    name="event",
    label="Events",
    description="Event bus persistence and event type catalog",
    permissions=[
        "event.read",
        "event.read_all",
        "event.types",
    ],
    tutorial_order=80,
    tutorials=[
        {
            "permission": "event.read",
            "label": "Journal des evenements",
            "description": "Consultez les evenements enregistres dans le systeme.",
            "steps": [{"target": ".page-header-card", "title": "Journal des evenements", "description": "Consultez les evenements recus : connexions, modifications, actions des utilisateurs.", "position": "bottom", "navigateTo": "/admin/events"}],
        },
        {
            "permission": "event.types",
            "label": "Catalogue des types",
            "description": "Decouvrez les types d'evenements declares par les features actives.",
            "steps": [{"target": ".page-header-card", "title": "Catalogue d'evenements", "description": "Consultez les types d'evenements declares par les features actives.", "position": "bottom", "navigateTo": "/admin/events/types"}],
        },
    ],
    router_module="src.core.event.routes",
    router_prefix="/api/events",
    router_tags=["Events"],
)
