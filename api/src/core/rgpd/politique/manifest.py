from ...feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="rgpd.politique",
    label="Pages legales",
    description="Pages legales editables : politique de confidentialite, CGU, mentions legales",
    parent="rgpd",
    permissions=["rgpd.politique.read", "rgpd.politique.manage"],
)
