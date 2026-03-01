from ...feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="preference.couleur",
    label="Couleurs personnalisees",
    description="Personnalisation des couleurs de l'application par l'utilisateur",
    parent="preference",
    permissions=["preference.couleur.read"],
    tutorials=[
        {
            "permission": "preference.couleur.read",
            "label": "Personnaliser les couleurs",
            "description": "Personnalisez les couleurs de l'interface.",
            "steps": [{"target": ".preference-couleur-section", "title": "Couleurs", "description": "Choisissez la palette de couleurs qui vous convient.", "position": "bottom", "navigateTo": "/profile/preferences?tab=couleur"}],
        },
    ],
)
