from ...feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="preference.font",
    label="Typographie",
    description="Personnalisation de la police, taille du texte et interligne",
    parent="preference",
    permissions=["preference.font.read"],
)
