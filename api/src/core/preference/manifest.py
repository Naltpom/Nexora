from ..feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="preference",
    label="Preferences",
    description="Gestion des preferences utilisateur (theme, tutoriels, etc.)",
    children=["preference.theme", "preference.didacticiel", "preference.couleur", "preference.langue"],
    permissions=["preference.read"],
)
