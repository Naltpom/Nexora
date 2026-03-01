from ...feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="preference.theme",
    label="Theme et Apparence",
    description="Gestion du theme clair/sombre et des fonds visuels",
    parent="preference",
    permissions=["preference.theme.read"],
    tutorials=[
        {
            "permission": "preference.theme.read",
            "label": "Personnaliser le theme",
            "description": "Choisissez votre theme et vos couleurs preferees.",
            "steps": [{"target": ".preference-theme-section", "title": "Section theme", "description": "Selectionnez un theme clair, sombre ou automatique selon vos preferences.", "position": "bottom", "navigateTo": "/profile/preferences?tab=theme"}],
        },
    ],
)
