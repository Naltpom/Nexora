from ...feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="rgpd.export",
    label="Export des donnees",
    description="Export des donnees personnelles de l'utilisateur (Article 20 RGPD — portabilite)",
    parent="rgpd",
    permissions=["rgpd.export.read"],
)
