from ...feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="preference.didacticiel",
    label="Didacticiel",
    description="Systeme de tutoriels in-app avec mise en surbrillance",
    version="2026.02.24",
    parent="preference",
    permissions=["preference.didacticiel.read", "preference.didacticiel.manage"],
    router_module="src.core.preference.didacticiel.routes",
    router_prefix="/api/preference/didacticiel",
    router_tags=["Didacticiel"],
)
