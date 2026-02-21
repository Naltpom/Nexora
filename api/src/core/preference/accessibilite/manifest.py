from ...feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="preference.accessibilite",
    label="Accessibilite",
    description="Contraste eleve, reduction des animations, police dyslexie, focus renforce",
    version="2026.02.25",
    parent="preference",
    permissions=["preference.accessibilite.read"],
)
