from ...feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="rgpd.consentement",
    label="Consentement cookies",
    description="Banniere de consentement cookies et enregistrement des choix utilisateur",
    version="2026.02.21",
    parent="rgpd",
    permissions=["rgpd.consentement.read", "rgpd.consentement.manage"],
)
