"""File storage feature models."""

import uuid as uuid_mod
from datetime import datetime, timezone

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class StorageDocument(Base):
    __tablename__ = "storage_documents"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    uuid: Mapped[str] = mapped_column(
        String(36), unique=True, nullable=False, index=True,
        default=lambda: str(uuid_mod.uuid4()),
    )

    # Original file info
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    extension: Mapped[str] = mapped_column(String(20), nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)

    # Storage location
    storage_backend: Mapped[str] = mapped_column(
        String(20), nullable=False, default="local",
    )
    storage_path: Mapped[str] = mapped_column(String(500), nullable=False)

    # Ownership
    uploaded_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )

    # Polymorphic association
    resource_type: Mapped[str] = mapped_column(String(100), nullable=False, default="general")
    resource_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False, default="document")

    # Thumbnail
    has_thumbnail: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Integrity
    checksum_sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # Visibility
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Antivirus scan
    scan_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending",
    )
    scan_result: Mapped[str | None] = mapped_column(String(255), nullable=True)

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

    # Soft delete
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True,
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
    )

    uploader = relationship("User", foreign_keys=[uploaded_by])

    __table_args__ = (
        Index("ix_storage_documents_resource", "resource_type", "resource_id"),
        Index("ix_storage_documents_owner_created", "uploaded_by", "created_at"),
        Index("ix_storage_documents_category", "category"),
        Index("ix_storage_documents_status_created", "status", "created_at"),
    )


class FileStoragePolicy(Base):
    """Per-resource_type moderation policy for file uploads."""
    __tablename__ = "file_storage_policies"

    resource_type: Mapped[str] = mapped_column(String(100), primary_key=True)
    requires_moderation: Mapped[bool] = mapped_column(Boolean, default=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_by_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True,
    )
