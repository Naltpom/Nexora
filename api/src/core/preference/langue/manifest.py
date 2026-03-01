from ...feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="preference.langue",
    label="Langue",
    description="Preference de langue utilisateur",
    parent="preference",
    depends=["i18n"],
    permissions=["preference.langue.read"],
    tutorials=[
        {
            "permission": "preference.langue.read",
            "label": "Changer la langue",
            "description": "Choisissez la langue de l'interface.",
            "steps": [{"target": ".langue-section__grid", "title": "Selection de la langue", "description": "Choisissez votre langue preferee parmi les langues disponibles.", "position": "bottom", "navigateTo": "/profile/preferences?tab=langue"}],
        },
    ],
    router_module="src.core.preference.langue.routes",
    router_prefix="/api/preferences",
    router_tags=["PreferenceLangue"],
)
