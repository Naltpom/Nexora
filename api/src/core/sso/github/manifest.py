from ...feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="sso.github",
    label="GitHub SSO",
    description="Connexion avec GitHub OAuth2",
    version="2026.02.3",
    parent="sso",
    permissions=["sso.github.login"],
    config_keys=["SSO_GITHUB_CLIENT_ID", "SSO_GITHUB_CLIENT_SECRET", "SSO_GITHUB_REDIRECT_URI"],
    router_module="src.core.sso.github.routes",
    router_prefix="/api/sso/github",
    router_tags=["SSO GitHub"],
)
