from ....core.feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="notification.email",
    label="Email Notifications",
    description="SMTP email delivery channel",
    version="1.0.0",
    parent="notification",
    permissions=["notification.email.send", "notification.email.resend"],
    config_keys=["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM_EMAIL", "EMAIL_ENABLED"],
)
