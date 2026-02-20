from ..feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="mfa",
    label="Authentification Multi-Facteurs (MFA)",
    description="Gestion et application de l'authentification multi-facteurs",
    version="2026.02.7",
    children=["mfa.totp", "mfa.email"],
    permissions=[
        "mfa.manage",
        "mfa.setup",
        "mfa.bypass",
    ],
    router_module="src.core.mfa.routes",
    router_prefix="/api/mfa",
    router_tags=["MFA"],
)
