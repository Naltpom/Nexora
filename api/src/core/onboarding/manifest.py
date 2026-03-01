from ..feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="onboarding",
    label="Onboarding",
    description="Assistant de premiere connexion pour configurer son profil et ses preferences",
    permissions=["onboarding.read"],
    events=[
        {
            "event_type": "onboarding.completed",
            "label": "Onboarding termine",
            "category": "onboarding",
            "description": "Un utilisateur a termine l'assistant de premiere connexion",
        },
        {
            "event_type": "onboarding.skipped",
            "label": "Onboarding ignore",
            "category": "onboarding",
            "description": "Un utilisateur a ignore l'assistant de premiere connexion",
        },
    ],
    router_module="src.core.onboarding.routes",
    router_prefix="/api/onboarding",
    router_tags=["Onboarding"],
)
