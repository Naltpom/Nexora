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
    tutorials=[
        {
            "permission": "notification.webhook.read",
            "label": "Configurer des webhooks",
            "description": "Consultez et gerez vos webhooks de notification.",
            "steps": [{"target": ".notif-section", "title": "Vos webhooks", "description": "Retrouvez ici la liste de vos webhooks personnels et globaux. Testez, modifiez ou supprimez-les.", "position": "top", "navigateTo": "/notifications/settings?tab=webhooks"}],
        },
        {
            "permission": "notification.webhook.create",
            "label": "Creer un webhook",
            "description": "Configurez des webhooks pour recevoir des notifications HTTP.",
            "steps": [{"target": ".notif-section-header .btn-primary", "title": "Ajouter un webhook", "description": "Cliquez ici pour creer un nouveau webhook. Choisissez le format (custom, Slack, Discord) et configurez l'URL.", "position": "bottom", "navigateTo": "/notifications/settings?tab=webhooks"}],
        },
    ],
    router_module="src.core.notification.webhook.routes",
    router_prefix="/api/notifications/webhooks",
    router_tags=["Webhooks"],
)
