"""Event feature models: persisted application events."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Integer, DateTime, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    redirect_token: Mapped[str] = mapped_column(
        String(36), default=lambda: str(uuid.uuid4()), unique=True, nullable=False
    )
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    actor_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    resource_type: Mapped[str] = mapped_column(String(50), nullable=False)
    resource_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    __table_args__ = (
        Index("ix_events_event_type", "event_type"),
        Index("ix_events_created_at", "created_at"),
    )
