from ...feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="mfa.email",
    label="Email OTP",
    description="Mot de passe a usage unique envoye par email",
    parent="mfa",
    depends=["notification.email"],
    permissions=["mfa.email.setup"],
    events=[
        {"event_type": "mfa.email_enabled", "label": "Email MFA active", "category": "MFA", "description": "Le MFA par email a ete active"},
        {"event_type": "mfa.email_disabled", "label": "Email MFA desactive", "category": "MFA", "description": "Le MFA par email a ete desactive"},
    ],
    config_keys=["MFA_EMAIL_CODE_LENGTH", "MFA_EMAIL_CODE_EXPIRY_MINUTES"],
    router_module="src.core.mfa.email.routes",
    router_prefix="/api/mfa/email",
    router_tags=["MFA Email"],
)
