"""Feature flags models."""

from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class FeatureFlag(Base):
    __tablename__ = "feature_flags"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    feature_name: Mapped[str] = mapped_column(
        String(100),
        ForeignKey("feature_states.name", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    strategy: Mapped[str] = mapped_column(String(20), nullable=False, default="boolean")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    rollout_percentage: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    target_roles: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    target_users: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    variants: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_by_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    updated_by_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    created_by = relationship("User", foreign_keys=[created_by_id])
    updated_by = relationship("User", foreign_keys=[updated_by_id])
