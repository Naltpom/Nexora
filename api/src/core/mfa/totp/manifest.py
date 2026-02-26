from ...feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="mfa.totp",
    label="TOTP (Application Authenticator)",
    description="Mot de passe a usage unique base sur le temps via application authenticator",
    parent="mfa",
    permissions=["mfa.totp.setup"],
    events=[
        {"event_type": "mfa.totp_enabled", "label": "TOTP active", "category": "MFA", "description": "Le MFA par application TOTP a ete active"},
        {"event_type": "mfa.totp_disabled", "label": "TOTP desactive", "category": "MFA", "description": "Le MFA par application TOTP a ete desactive"},
    ],
    config_keys=["MFA_TOTP_ISSUER_NAME"],
    router_module="src.core.mfa.totp.routes",
    router_prefix="/api/mfa/totp",
    router_tags=["MFA TOTP"],
)
