"""Comments feature models: polymorphic comments attached to any entity."""

from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True,
    )
    resource_type: Mapped[str] = mapped_column(String(100), nullable=False)
    resource_id: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    parent_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("comments.id"), nullable=True,
    )
    is_edited: Mapped[bool] = mapped_column(Boolean, default=False)
    edited_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True,
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    # Moderation
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="approved", server_default="approved",
    )
    moderated_by_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True,
    )
    moderated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True,
    )

    __table_args__ = (
        Index("ix_comments_resource", "resource_type", "resource_id"),
        Index("ix_comments_user_created", "user_id", "created_at"),
        Index("ix_comments_parent", "parent_id"),
        Index("ix_comments_created_at", "created_at"),
        Index("ix_comments_status_created", "status", "created_at"),
    )


class CommentPolicy(Base):
    """Per-resource_type moderation policy."""
    __tablename__ = "comment_policies"

    resource_type: Mapped[str] = mapped_column(String(100), primary_key=True)
    requires_moderation: Mapped[bool] = mapped_column(Boolean, default=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_by_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True,
    )
