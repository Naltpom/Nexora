from ....core.feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="preference.theme",
    label="Theme et Apparence",
    description="Gestion du theme clair/sombre et des fonds visuels",
    version="2026.02.7",
    parent="preference",
    permissions=["preference.theme.read"],
)
