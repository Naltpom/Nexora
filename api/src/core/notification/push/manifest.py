from ...feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="notification.push",
    label="Push Notifications",
    description="Web Push notification delivery channel",
    version="2026.02.1",
    parent="notification",
    permissions=["notification.push.subscribe", "notification.push.read"],
    config_keys=["VAPID_PRIVATE_KEY", "VAPID_PUBLIC_KEY", "PUSH_ENABLED"],
    router_module="src.core.notification.push.routes",
    router_prefix="/api/notifications/push",
    router_tags=["Push Notifications"],
)
