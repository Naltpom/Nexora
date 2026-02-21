from ...feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="rgpd.politique",
    label="Pages legales",
    description="Pages legales editables : politique de confidentialite, CGU, mentions legales",
    version="2026.02.20",
    parent="rgpd",
    permissions=["rgpd.politique.read", "rgpd.politique.manage"],
)
