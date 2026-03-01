from ..feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="lifecycle",
    label="Cycle de vie",
    description="Gestion automatique du cycle de vie des comptes (inactivite, archivage, suppression)",
    depends=["event", "notification.email"],
    permissions=["lifecycle.read", "lifecycle.manage"],
    tutorial_order=70,
    tutorials=[
        {
            "permission": "lifecycle.read",
            "label": "Cycle de vie des comptes",
            "description": "Consultez les comptes inactifs et archives.",
            "steps": [
                {"target": ".lifecycle-stats", "title": "Statistiques", "description": "Consultez le nombre d'utilisateurs actifs, bientot archives et deja archives.", "position": "bottom", "navigateTo": "/admin/lifecycle"},
                {"target": ".lifecycle-tabs", "title": "Onglets", "description": "Basculez entre les utilisateurs bientot archives et ceux deja archives.", "position": "bottom", "navigateTo": "/admin/lifecycle"},
            ],
        },
        {
            "permission": "lifecycle.manage",
            "label": "Gerer le cycle de vie",
            "description": "Reactivez des utilisateurs archives.",
            "steps": [{"target": ".lifecycle-btn-reactivate", "title": "Reactiver", "description": "Cliquez sur ce bouton pour reactiver un utilisateur archive et lui redonner acces a la plateforme.", "position": "left", "navigateTo": "/admin/lifecycle"}],
        },
    ],
    events=[
        {
            "event_type": "lifecycle.user_archived",
            "label": "Utilisateur archive",
            "category": "Lifecycle",
            "description": "Un utilisateur a ete archive pour inactivite",
        },
        {
            "event_type": "lifecycle.user_deleted",
            "label": "Utilisateur supprime",
            "category": "Lifecycle",
            "description": "Un utilisateur archive a ete supprime definitivement",
        },
        {
            "event_type": "lifecycle.user_reactivated",
            "label": "Utilisateur reactive",
            "category": "Lifecycle",
            "description": "Un utilisateur archive a ete reactive par un admin",
        },
    ],
    router_module="src.core.lifecycle.routes",
    router_prefix="/api/lifecycle",
    router_tags=["Lifecycle"],
)
