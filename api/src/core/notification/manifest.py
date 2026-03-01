from ..feature_registry import FeatureManifest

# Subscribe to the event bus (listens to event.persisted for the rules engine).
from . import event_handlers  # noqa: F401

manifest = FeatureManifest(
    name="notification",
    label="Notifications",
    description="In-app notification system with rules engine",
    depends=["event", "realtime"],
    children=["notification.email", "notification.push", "notification.webhook"],
    permissions=[
        "notification.read", "notification.delete",
        "notification.email.resend", "notification.push.resend",
        "notification.rules.read", "notification.rules.create",
        "notification.rules.update", "notification.rules.delete",
        "notification.admin",
    ],
    events=[
        {"event_type": "notification.rule_created", "label": "Regle de notification creee", "category": "Notifications", "description": "Une nouvelle regle de notification a ete creee"},
        {"event_type": "notification.push.resent", "label": "Push renvoye", "category": "Notifications", "description": "Une notification push a ete renvoyee manuellement"},
    ],
    tutorials=[
        {
            "permission": "notification.read",
            "label": "Consulter les notifications",
            "description": "Apprenez a consulter et gerer vos notifications.",
            "steps": [
                {"target": ".notification-bell-btn", "title": "Cloche de notifications", "description": "Cliquez ici pour voir vos notifications recentes sans quitter la page courante.", "position": "bottom"},
                {"target": ".unified-page-header", "title": "Page des notifications", "description": "Retrouvez ici l'historique complet de vos notifications. Marquez-les comme lues ou supprimez-les.", "position": "bottom", "navigateTo": "/notifications"},
            ],
        },
        {
            "permission": "notification.rules.read",
            "label": "Regles de notification",
            "description": "Decouvrez comment configurer des regles.",
            "steps": [
                {"target": ".notif-tab", "title": "Onglets", "description": "Basculez entre la gestion des regles et des webhooks.", "position": "bottom", "navigateTo": "/notifications/settings"},
                {"target": ".notif-rules-table", "title": "Liste des regles", "description": "Visualisez vos regles de notification : evenements surveilles, canaux actifs et etat.", "position": "top", "navigateTo": "/notifications/settings"},
            ],
        },
        {
            "permission": "notification.rules.create",
            "label": "Creer une regle",
            "description": "Creez des regles personnalisees de notification.",
            "steps": [{"target": ".notif-section-header .btn-primary", "title": "Creer une regle", "description": "Cliquez ici pour creer une nouvelle regle de notification avec des evenements et canaux personnalises.", "position": "bottom", "navigateTo": "/notifications/settings"}],
        },
        {
            "permission": "notification.rules.update",
            "label": "Modifier une regle",
            "description": "Modifiez les parametres d'une regle de notification existante.",
            "steps": [{"target": ".btn-icon-secondary", "title": "Modifier", "description": "Cliquez sur l'icone de modification pour editer les evenements, canaux et parametres d'une regle.", "position": "left", "navigateTo": "/notifications/settings"}],
        },
        {
            "permission": "notification.rules.delete",
            "label": "Supprimer une regle",
            "description": "Supprimez une regle de notification que vous ne souhaitez plus.",
            "steps": [{"target": ".btn-icon-danger", "title": "Supprimer", "description": "Cliquez sur l'icone de suppression pour retirer une regle. Cette action est irreversible.", "position": "left", "navigateTo": "/notifications/settings"}],
        },
        {
            "permission": "notification.admin",
            "label": "Administration des notifications",
            "description": "Gerez les regles globales et parametres admin.",
            "steps": [{"target": ".notif-section", "title": "Section administration", "description": "En tant qu'admin, vous pouvez gerer les regles globales qui s'appliquent a tous les utilisateurs.", "position": "top", "navigateTo": "/notifications/settings"}],
        },
    ],
    tutorial_order=50,
    router_module="src.core.notification.routes",
    router_prefix="/api/notifications",
    router_tags=["Notifications"],
)
