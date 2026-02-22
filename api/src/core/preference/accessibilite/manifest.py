from ...feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="preference.accessibilite",
    label="Accessibilite",
    description="Contraste eleve, reduction des animations, police dyslexie, focus renforce",
    parent="preference",
    permissions=["preference.accessibilite.read"],
)
