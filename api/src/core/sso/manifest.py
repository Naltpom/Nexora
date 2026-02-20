from ..feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="sso",
    label="Single Sign-On (SSO)",
    description="Authentification OAuth2 via fournisseurs externes",
    version="2026.02.5",
    children=["sso.google", "sso.github"],
    permissions=[
        "sso.manage",
        "sso.link",
    ],
    router_module="src.core.sso.routes",
    router_prefix="/api/sso",
    router_tags=["SSO"],
)
