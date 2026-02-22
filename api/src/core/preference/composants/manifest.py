from ...feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="preference.composants",
    label="Style des composants",
    description="Personnalisation du style des cards, tables, modals et boutons",
    parent="preference",
    permissions=["preference.composants.read"],
)
