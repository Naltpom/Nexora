from ...feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="rgpd.registre",
    label="Registre des traitements",
    description="Registre des traitements de donnees personnelles (Article 30 RGPD)",
    version="2026.02.20",
    parent="rgpd",
    permissions=["rgpd.registre.read", "rgpd.registre.manage"],
)
