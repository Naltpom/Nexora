from ...feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="rgpd.consentement",
    label="Consentement cookies",
    description="Banniere de consentement cookies et enregistrement des choix utilisateur",
    parent="rgpd",
    permissions=["rgpd.consentement.read", "rgpd.consentement.manage"],
)
