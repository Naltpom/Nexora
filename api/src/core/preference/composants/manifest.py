from ...feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="preference.composants",
    label="Style des composants",
    description="Personnalisation du style des cards, tables, modals et boutons",
    parent="preference",
    permissions=["preference.composants.read"],
    tutorials=[
        {
            "permission": "preference.composants.read",
            "label": "Personnaliser les composants",
            "description": "Configurez l'apparence des composants d'interface.",
            "steps": [{"target": ".preference-composants-section", "title": "Composants", "description": "Personnalisez l'apparence des boutons, tableaux et autres composants.", "position": "bottom", "navigateTo": "/profile/preferences?tab=composants"}],
        },
    ],
)
