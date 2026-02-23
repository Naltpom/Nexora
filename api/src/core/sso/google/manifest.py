from ...feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="sso.google",
    label="Google SSO",
    description="Connexion avec Google OAuth2",
    parent="sso",
    permissions=[],
    config_keys=["SSO_GOOGLE_CLIENT_ID", "SSO_GOOGLE_CLIENT_SECRET", "SSO_GOOGLE_REDIRECT_URI"],
    router_module="src.core.sso.google.routes",
    router_prefix="/api/sso/google",
    router_tags=["SSO Google"],
)
