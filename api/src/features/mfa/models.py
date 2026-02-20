"""MFA models: UserMFA, MFABackupCode, MFARolePolicy."""

from datetime import datetime, timezone

from sqlalchemy import String, Boolean, Integer, ForeignKey, DateTime, Text, Index, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB

from ...core.database import Base


class UserMFA(Base):
    """Per-user MFA configuration (one row per method)."""
    __tablename__ = "user_mfa"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    method: Mapped[str] = mapped_column(String(20), nullable=False)  # "totp" or "email"
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)

    # TOTP specific
    totp_secret_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    totp_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    # Email specific
    email_address: Mapped[str | None] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    user = relationship("User", backref="mfa_methods")

    __table_args__ = (
        UniqueConstraint("user_id", "method", name="uq_user_mfa_user_method"),
    )


class MFABackupCode(Base):
    """Recovery codes for MFA."""
    __tablename__ = "mfa_backup_codes"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    code_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_used: Mapped[bool] = mapped_column(Boolean, default=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    user = relationship("User", backref="mfa_backup_codes")


class MFARolePolicy(Base):
    """Admin-configured MFA policies per role."""
    __tablename__ = "mfa_role_policies"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    role_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("roles.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    mfa_required: Mapped[bool] = mapped_column(Boolean, default=False)
    allowed_methods: Mapped[dict | None] = mapped_column(JSONB, nullable=True)  # e.g. ["totp", "email"]
    grace_period_days: Mapped[int] = mapped_column(Integer, default=7)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    role = relationship("Role", backref="mfa_policy")
