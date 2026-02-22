from ...feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="preference.layout",
    label="Mise en page",
    description="Densite d'affichage, border-radius, largeur du contenu",
    parent="preference",
    permissions=["preference.layout.read"],
)
