from ..feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="preference",
    label="Preferences",
    description="Gestion des preferences utilisateur (theme, tutoriels, etc.)",
    version="2026.02.26",
    children=["preference.theme", "preference.didacticiel", "preference.couleur"],
    permissions=["preference.read"],
)
