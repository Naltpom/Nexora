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
    tutorials=[
        {
            "permission": "notification.push.subscribe",
            "label": "Activer les notifications push",
            "description": "Recevez des notifications directement dans votre navigateur.",
            "steps": [{"target": ".notif-push-controls", "title": "Notifications push", "description": "Activez les notifications push pour recevoir des alertes en temps reel, meme lorsque l'application est en arriere-plan.", "position": "bottom", "navigateTo": "/notifications/settings"}],
        },
    ],
    config_keys=["VAPID_PRIVATE_KEY", "VAPID_PUBLIC_KEY", "PUSH_ENABLED"],
    router_module="src.core.notification.push.routes",
    router_prefix="/api/notifications/push",
    router_tags=["Push Notifications"],
)
