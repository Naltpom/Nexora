"""Export history feature models."""

import uuid as uuid_mod
from datetime import datetime, timezone

from sqlalchemy import BigInteger, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class ExportHistory(Base):
    __tablename__ = "export_history"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    uuid: Mapped[str] = mapped_column(
        String(36), unique=True, nullable=False, index=True,
        default=lambda: str(uuid_mod.uuid4()),
    )

    # Who triggered the export
    user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )

    # Export descriptor
    export_id: Mapped[str] = mapped_column(String(100), nullable=False)
    export_label: Mapped[str] = mapped_column(String(255), nullable=False)
    feature_name: Mapped[str] = mapped_column(String(100), nullable=False)
    format: Mapped[str] = mapped_column(String(20), nullable=False)

    # Parameters used for the export (JSON string)
    params_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Human-readable display of parameters
    params_display: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Optional OC context
    oc_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    oc_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Link to stored file
    storage_document_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("storage_documents.id", ondelete="SET NULL"),
        nullable=True,
    )

    file_size_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    # Result
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="success")
    error_detail: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    storage_document = relationship("StorageDocument", foreign_keys=[storage_document_id])

    __table_args__ = (
        Index("ix_export_history_user_created", "user_id", "created_at"),
        Index("ix_export_history_feature_name", "feature_name"),
        Index("ix_export_history_export_id", "export_id"),
    )
