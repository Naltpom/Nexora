from ...feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="rgpd.droits",
    label="Exercice des droits",
    description="Gestion des demandes d'exercice de droits RGPD (acces, suppression, portabilite...)",
    version="2026.02.20",
    parent="rgpd",
    permissions=["rgpd.droits.read", "rgpd.droits.manage"],
)
