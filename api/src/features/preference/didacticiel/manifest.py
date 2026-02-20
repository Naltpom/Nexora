from ....core.feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="preference.didacticiel",
    label="Didacticiel",
    description="Systeme de tutoriels in-app avec mise en surbrillance",
    version="2026.02.7",
    parent="preference",
    permissions=["preference.didacticiel.read"],
    router_module="src.features.preference.didacticiel.routes",
    router_prefix="/api/preference/didacticiel",
    router_tags=["Didacticiel"],
)
