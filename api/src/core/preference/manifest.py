from ..feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="preference",
    label="Preferences",
    description="Gestion des preferences utilisateur (theme, tutoriels, etc.)",
    version="2026.02.7",
    children=["preference.theme", "preference.didacticiel"],
    permissions=["preference.read"],
)
