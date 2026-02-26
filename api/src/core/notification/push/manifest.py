from ...feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="notification.push",
    label="Push Notifications",
    description="Web Push notification delivery channel",
    parent="notification",
    permissions=["notification.push.subscribe", "notification.push.read", "notification.push.resend"],
    events=[
        {"event_type": "notification.push.subscribed", "label": "Abonnement push", "category": "Notifications", "description": "Un utilisateur s'est abonne aux notifications push"},
        {"event_type": "notification.push.unsubscribed", "label": "Desabonnement push", "category": "Notifications", "description": "Un utilisateur s'est desabonne des notifications push"},
        {"event_type": "notification.push.resent", "label": "Push renvoye", "category": "Notifications", "description": "Une notification push a ete renvoyee manuellement"},
    ],
    config_keys=["VAPID_PRIVATE_KEY", "VAPID_PUBLIC_KEY", "PUSH_ENABLED"],
    router_module="src.core.notification.push.routes",
    router_prefix="/api/notifications/push",
    router_tags=["Push Notifications"],
)
