from ...feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="preference.langue",
    label="Langue",
    description="Preference de langue utilisateur",
    parent="preference",
    depends=["i18n"],
    permissions=["preference.langue.read"],
    router_module="src.core.preference.langue.routes",
    router_prefix="/api/preferences",
    router_tags=["PreferenceLangue"],
)
