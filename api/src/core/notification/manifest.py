from ..feature_registry import FeatureManifest

# Subscribe to the event bus (listens to event.persisted for the rules engine).
from . import event_handlers  # noqa: F401

manifest = FeatureManifest(
    name="notification",
    label="Notifications",
    description="In-app notification system with rules engine and SSE",
    version="2026.02.26",
    depends=["event"],
    children=["notification.email", "notification.push", "notification.webhook"],
    permissions=[
        "notification.read", "notification.delete",
        "notification.rules.read", "notification.rules.create",
        "notification.rules.update", "notification.rules.delete",
        "notification.admin",
    ],
    events=[
        {"event_type": "notification.rule_created", "label": "Regle de notification creee", "category": "Notifications", "description": "Une nouvelle regle de notification a ete creee"},
    ],
    router_module="src.core.notification.routes",
    router_prefix="/api/notifications",
    router_tags=["Notifications"],
)
