from ...feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="preference.layout",
    label="Mise en page",
    description="Densite d'affichage, border-radius, largeur du contenu",
    parent="preference",
    permissions=["preference.layout.read"],
    tutorials=[
        {
            "permission": "preference.layout.read",
            "label": "Personnaliser la mise en page",
            "description": "Configurez la densite et la disposition de l'interface.",
            "steps": [{"target": ".preference-layout-section", "title": "Mise en page", "description": "Ajustez la densite (compact, normal, aere), les arrondis et la largeur du contenu.", "position": "bottom", "navigateTo": "/profile/preferences?tab=layout"}],
        },
    ],
)
