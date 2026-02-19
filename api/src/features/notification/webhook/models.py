"""Webhook models: Webhook."""

from datetime import datetime, timezone

from sqlalchemy import String, Integer, Boolean, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ....core.database import Base


class Webhook(Base):
    __tablename__ = "webhooks"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    url: Mapped[str] = mapped_column(String(1000), nullable=False)
    secret: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_global: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    format: Mapped[str] = mapped_column(String(20), default="custom", nullable=False)  # custom, slack, discord
    prefix: Mapped[str | None] = mapped_column(String(500), nullable=True)
    event_types: Mapped[list | None] = mapped_column(JSONB, nullable=True)  # null = all events
    notification_rule_ids: Mapped[list | None] = mapped_column(JSONB, nullable=True)  # null = all rules
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    user = relationship("User", foreign_keys=[user_id])
