from ...feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="preference.didacticiel",
    label="Didacticiel",
    description="Systeme de tutoriels in-app avec mise en surbrillance",
    parent="preference",
    permissions=["preference.didacticiel.read", "preference.didacticiel.manage"],
    router_module="src.core.preference.didacticiel.routes",
    router_prefix="/api/preference/didacticiel",
    router_tags=["Didacticiel"],
)
