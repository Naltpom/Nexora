from ...feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="mfa.email",
    label="Email OTP",
    description="Mot de passe a usage unique envoye par email",
    version="2026.02.3",
    parent="mfa",
    depends=["notification.email"],
    permissions=["mfa.email.setup"],
    config_keys=["MFA_EMAIL_CODE_LENGTH", "MFA_EMAIL_CODE_EXPIRY_MINUTES"],
    router_module="src.core.mfa.email.routes",
    router_prefix="/api/mfa/email",
    router_tags=["MFA Email"],
)
