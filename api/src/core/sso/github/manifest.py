from ...feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="sso.github",
    label="GitHub SSO",
    description="Connexion avec GitHub OAuth2",
    parent="sso",
    permissions=[],
    config_keys=["SSO_GITHUB_CLIENT_ID", "SSO_GITHUB_CLIENT_SECRET", "SSO_GITHUB_REDIRECT_URI"],
    router_module="src.core.sso.github.routes",
    router_prefix="/api/sso/github",
    router_tags=["SSO GitHub"],
)
