from ...feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="rgpd.audit",
    label="Audit RGPD",
    description="Journal d'audit des acces aux donnees personnelles",
    version="2026.02.20",
    parent="rgpd",
    permissions=["rgpd.audit.read"],
)
