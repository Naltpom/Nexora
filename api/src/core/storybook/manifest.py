from ..feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="storybook",
    label="Storybook",
    description="Catalogue visuel des composants UI",
    permissions=["storybook.read"],
)
