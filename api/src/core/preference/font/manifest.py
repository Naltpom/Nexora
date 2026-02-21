from ...feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="preference.font",
    label="Typographie",
    description="Personnalisation de la police, taille du texte et interligne",
    version="2026.02.25",
    parent="preference",
    permissions=["preference.font.read"],
)
