from ..feature_registry import FeatureManifest
from .middleware import I18nMiddleware

manifest = FeatureManifest(
    name="i18n",
    label="Internationalisation",
    description="Systeme i18n avec traductions decentralisees par feature",
    permissions=["i18n.read"],
    config_keys=["I18N_DEFAULT_LOCALE", "I18N_SUPPORTED_LOCALES"],
    router_module="src.core.i18n.routes",
    router_prefix="/api/i18n",
    router_tags=["I18n"],
    middleware=[I18nMiddleware],
)
