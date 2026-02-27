"""Lifecycle feature model: tracks which lifecycle emails have been sent."""

from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class LifecycleEmail(Base):
    __tablename__ = "lifecycle_emails"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    email_type: Mapped[str] = mapped_column(String(50), nullable=False)
    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    user = relationship("User", foreign_keys=[user_id])

    __table_args__ = (
        UniqueConstraint("user_id", "email_type", name="uq_lifecycle_emails_user_type"),
        Index("ix_lifecycle_emails_user_id", "user_id"),
    )
