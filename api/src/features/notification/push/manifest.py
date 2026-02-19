from ....core.feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="notification.push",
    label="Push Notifications",
    description="Web Push notification delivery channel",
    version="1.0.0",
    parent="notification",
    permissions=["notification.push.subscribe", "notification.push.read"],
    config_keys=["VAPID_PRIVATE_KEY", "VAPID_PUBLIC_KEY", "PUSH_ENABLED"],
    router_module="src.features.notification.push.routes",
    router_prefix="/api/notifications/push",
    router_tags=["Push Notifications"],
)
