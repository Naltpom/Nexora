from ..feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="lifecycle",
    label="Cycle de vie",
    description="Gestion automatique du cycle de vie des comptes (inactivite, archivage, suppression)",
    depends=["event", "notification.email"],
    permissions=["lifecycle.read", "lifecycle.manage"],
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
