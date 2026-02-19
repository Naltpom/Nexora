from ...core.feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="notification",
    label="Notifications",
    description="In-app notification system with rules engine and SSE",
    version="1.0.0",
    children=["notification.email", "notification.push", "notification.webhook"],
    permissions=[
        "notification.read", "notification.delete",
        "notification.rules.read", "notification.rules.create",
        "notification.rules.update", "notification.rules.delete",
        "notification.admin",
    ],
    router_module="src.features.notification.routes",
    router_prefix="/api/notifications",
    router_tags=["Notifications"],
)
