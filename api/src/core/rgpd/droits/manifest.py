from ...feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="rgpd.droits",
    label="Exercice des droits",
    description="Gestion des demandes d'exercice de droits RGPD (acces, suppression, portabilite...)",
    parent="rgpd",
    permissions=["rgpd.droits.read", "rgpd.droits.manage"],
)
