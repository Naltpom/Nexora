from ...feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="preference.font",
    label="Typographie",
    description="Personnalisation de la police, taille du texte et interligne",
    parent="preference",
    permissions=["preference.font.read"],
    tutorials=[
        {
            "permission": "preference.font.read",
            "label": "Personnaliser la typographie",
            "description": "Ajustez la police et la taille du texte.",
            "steps": [{"target": ".preference-font-section", "title": "Typographie", "description": "Modifiez la police, la taille et le poids du texte pour une meilleure lisibilite.", "position": "bottom", "navigateTo": "/profile/preferences?tab=font"}],
        },
    ],
)
