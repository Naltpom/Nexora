from pathlib import Path

import yaml
from pydantic_settings import BaseSettings


def _deep_merge(base: dict, override: dict) -> dict:
    """Deep merge override into base. Override values take precedence."""
    result = base.copy()
    for key, value in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = _deep_merge(result[key], value)
        else:
            result[key] = value
    return result


def load_yaml_config() -> dict:
    """Load and merge config.template.yaml + config.custom.yaml."""
    root = Path(__file__).resolve().parents[3]  # api/src/core -> project root
    template_path = root / "config.template.yaml"
    custom_path = root / "config.custom.yaml"

    template = {}
    custom = {}

    if template_path.exists():
        template = yaml.safe_load(template_path.read_text(encoding="utf-8")) or {}
    if custom_path.exists():
        custom = yaml.safe_load(custom_path.read_text(encoding="utf-8")) or {}

    return _deep_merge(template, custom)


yaml_config = load_yaml_config()


class Settings(BaseSettings):
    # PostgreSQL
    POSTGRES_USER: str = "template_user"
    POSTGRES_PASSWORD: str = "template_dev_password"
    POSTGRES_DB: str = "template_db"
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: int = 5432

    # JWT
    SECRET_KEY: str = "dev_secret_key_change_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24h
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Upload
    UPLOAD_DIR: str = "/app/uploads"
    MAX_UPLOAD_SIZE_MB: int = 50

    # SMTP
    SMTP_HOST: str = "smtp.office365.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@example.com"
    SMTP_FROM_NAME: str = "Template App"
    SMTP_USE_TLS: bool = True
    EMAIL_ENABLED: bool = False

    # Webhooks
    WEBHOOK_TIMEOUT: int = 10
    WEBHOOK_MAX_RETRIES: int = 3

    # Web Push (VAPID)
    VAPID_PRIVATE_KEY: str = ""
    VAPID_PUBLIC_KEY: str = ""
    VAPID_SUBJECT: str = "mailto:noreply@example.com"
    PUSH_ENABLED: bool = False

    # Intranet SSO (for @kertios.com accounts)
    INTRANET_AUTH_URL: str = ""

    # SSO - Google OAuth2
    SSO_GOOGLE_CLIENT_ID: str = ""
    SSO_GOOGLE_CLIENT_SECRET: str = ""
    SSO_GOOGLE_REDIRECT_URI: str = "http://localhost:5472/sso/callback/google"

    # SSO - GitHub OAuth2
    SSO_GITHUB_CLIENT_ID: str = ""
    SSO_GITHUB_CLIENT_SECRET: str = ""
    SSO_GITHUB_REDIRECT_URI: str = "http://localhost:5472/sso/callback/github"

    # MFA - TOTP
    MFA_TOTP_ISSUER_NAME: str = "Kertios Template"

    # MFA - Email OTP
    MFA_EMAIL_CODE_LENGTH: int = 6
    MFA_EMAIL_CODE_EXPIRY_MINUTES: int = 5

    # Backups
    BACKUP_DIR: str = "/app/backups"
    ENV: str = "production"

    # Notification purge
    NOTIFICATION_PURGE_DAYS: int = 90  # Hard-delete soft-deleted notifications older than N days

    # Event purge
    EVENT_RETENTION_DAYS: int = 180  # Delete events older than N days

    # Push subscription cleanup
    PUSH_SUBSCRIPTION_RETENTION_DAYS: int = 90  # Delete inactive subscriptions older than N days

    # Impersonation log retention
    IMPERSONATION_LOG_RETENTION_DAYS: int = 180  # Delete impersonation logs older than N days

    # Command execution log retention
    COMMAND_LOG_RETENTION_DAYS: int = 90  # Delete command execution logs older than N days

    # Frontend URL (for reset password links)
    FRONTEND_URL: str = "http://localhost:5472"

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def database_url_sync(self) -> str:
        return (
            f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def is_dev(self) -> bool:
        return self.ENV == "dev"

    class Config:
        env_file = ".env"


settings = Settings()
