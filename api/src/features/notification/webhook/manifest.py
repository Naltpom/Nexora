from ....core.feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="notification.webhook",
    label="Webhook Notifications",
    description="HTTP webhook delivery channel",
    version="1.0.0",
    parent="notification",
    permissions=[
        "notification.webhook.read", "notification.webhook.create",
        "notification.webhook.update", "notification.webhook.delete",
        "notification.webhook.test",
        "notification.webhook.global.read", "notification.webhook.global.create",
    ],
    router_module="src.features.notification.webhook.routes",
    router_prefix="/api/notifications/webhooks",
    router_tags=["Webhooks"],
)
