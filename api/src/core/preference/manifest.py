from ..feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="preference",
    label="Preferences",
    description="Gestion des preferences utilisateur (theme, tutoriels, etc.)",
    children=[
        "preference.theme",
        "preference.couleur",
        "preference.font",
        "preference.layout",
        "preference.composants",
        "preference.accessibilite",
        "preference.langue",
        "preference.didacticiel",
    ],
    permissions=["preference.read"],
)
