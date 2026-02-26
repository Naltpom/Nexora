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
    events=[
        {"event_type": "notification.webhook.created", "label": "Webhook cree", "category": "Webhooks", "description": "Un webhook a ete cree"},
        {"event_type": "notification.webhook.updated", "label": "Webhook modifie", "category": "Webhooks", "description": "Un webhook a ete modifie"},
        {"event_type": "notification.webhook.deleted", "label": "Webhook supprime", "category": "Webhooks", "description": "Un webhook a ete supprime"},
        {"event_type": "notification.webhook.tested", "label": "Webhook teste", "category": "Webhooks", "description": "Un webhook a ete teste manuellement"},
    ],
    router_module="src.core.notification.webhook.routes",
    router_prefix="/api/notifications/webhooks",
    router_tags=["Webhooks"],
)
