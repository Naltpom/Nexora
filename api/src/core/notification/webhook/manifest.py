from ...feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="notification.webhook",
    label="Webhook Notifications",
    description="HTTP webhook delivery channel",
    parent="notification",
    permissions=[
        "notification.webhook.read", "notification.webhook.create",
        "notification.webhook.update", "notification.webhook.delete",
        "notification.webhook.test",
        "notification.webhook.global.read", "notification.webhook.global.create",
        "notification.webhook.global.update", "notification.webhook.global.delete",
    ],
    router_module="src.core.notification.webhook.routes",
    router_prefix="/api/notifications/webhooks",
    router_tags=["Webhooks"],
)
