"""SSO models: SSOAccount for linking external OAuth2 providers to users."""

from datetime import datetime, timezone

from sqlalchemy import String, Integer, ForeignKey, DateTime, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class SSOAccount(Base):
    __tablename__ = "sso_accounts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    provider_user_id: Mapped[str] = mapped_column(String(255), nullable=False)
    provider_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    provider_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    provider_avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user = relationship("User", backref="sso_accounts")

    __table_args__ = (
        UniqueConstraint("provider", "provider_user_id", name="uq_sso_provider_user"),
        UniqueConstraint("user_id", "provider", name="uq_sso_user_provider"),
        Index("ix_sso_user_provider", "user_id", "provider"),
    )
