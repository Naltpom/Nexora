from ...feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="preference.theme",
    label="Theme et Apparence",
    description="Gestion du theme clair/sombre et des fonds visuels",
    parent="preference",
    permissions=["preference.theme.read"],
)
