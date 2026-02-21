from ...feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="preference.couleur",
    label="Couleurs personnalisees",
    description="Personnalisation des couleurs de l'application par l'utilisateur",
    version="2026.02.16",
    parent="preference",
    permissions=["preference.couleur.read"],
)
