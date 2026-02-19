"""Notification feature models: Event, Notification, NotificationRule, UserRulePreference."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Integer, Text, Boolean, ForeignKey, DateTime, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ...core.database import Base


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    redirect_token: Mapped[str] = mapped_column(
        String(36), default=lambda: str(uuid.uuid4()), unique=True, nullable=False
    )
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    actor_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(50), nullable=False)
    resource_id: Mapped[int] = mapped_column(Integer, nullable=False)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    actor = relationship("User", foreign_keys=[actor_id])
    notifications = relationship("Notification", back_populates="event")

    __table_args__ = (
        Index("ix_events_event_type", "event_type"),
        Index("ix_events_created_at", "created_at"),
    )


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    event_id: Mapped[int] = mapped_column(Integer, ForeignKey("events.id"), nullable=False)
    rule_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("notification_rules.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    link: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    email_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    webhook_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    push_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    user = relationship("User", foreign_keys=[user_id])
    event = relationship("Event", back_populates="notifications")
    rule = relationship("NotificationRule", foreign_keys=[rule_id])

    __table_args__ = (
        Index("ix_notifications_user_unread", "user_id", "is_read", "created_at"),
        Index("ix_notifications_user_created", "user_id", "created_at"),
    )


class NotificationRule(Base):
    __tablename__ = "notification_rules"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    created_by_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)

    # What events trigger this rule
    event_types: Mapped[list] = mapped_column(JSONB, nullable=False)  # ["user.registered"] or ["*"]

    # Who gets notified
    target_type: Mapped[str] = mapped_column(String(30), nullable=False)  # "all"|"users"|"self"
    target_user_ids: Mapped[list | None] = mapped_column(JSONB, nullable=True)  # [1, 4, 7]

    # Notification channels
    channel_in_app: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    channel_email: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    channel_webhook: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    channel_push: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    webhook_ids: Mapped[list | None] = mapped_column(JSONB, nullable=True)  # [1, 3, 7]

    # Default channels for users (only relevant for template rules)
    default_in_app: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    default_email: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    default_webhook: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    default_push: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Config
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_default_template: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    created_by = relationship("User", foreign_keys=[created_by_id])

    def matches_event(self, event_type: str) -> bool:
        if self.event_types == ["*"]:
            return True
        return event_type in (self.event_types or [])


class UserRulePreference(Base):
    __tablename__ = "user_rule_preferences"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    rule_id: Mapped[int] = mapped_column(Integer, ForeignKey("notification_rules.id", ondelete="CASCADE"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    channel_in_app: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    channel_email: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    channel_webhook: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    channel_push: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_customized: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    webhook_ids: Mapped[list | None] = mapped_column(JSONB, nullable=True)  # specific webhook IDs for this rule

    __table_args__ = (
        UniqueConstraint("user_id", "rule_id", name="uq_user_rule_preferences_user_rule"),
    )

    user = relationship("User", foreign_keys=[user_id])
    rule = relationship("NotificationRule", foreign_keys=[rule_id])
