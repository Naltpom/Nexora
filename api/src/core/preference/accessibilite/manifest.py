from ...feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="preference.accessibilite",
    label="Accessibilite",
    description="Contraste eleve, reduction des animations, police dyslexie, focus renforce",
    parent="preference",
    permissions=["preference.accessibilite.read"],
    tutorials=[
        {
            "permission": "preference.accessibilite.read",
            "label": "Options d'accessibilite",
            "description": "Activez les options d'accessibilite pour une meilleure experience.",
            "steps": [{"target": ".preference-a11y-section", "title": "Accessibilite", "description": "Activez la reduction des animations, le mode contraste eleve ou d'autres options d'accessibilite.", "position": "bottom", "navigateTo": "/profile/preferences?tab=accessibilite"}],
        },
    ],
)
