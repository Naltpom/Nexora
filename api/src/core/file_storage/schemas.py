"""File storage feature Pydantic schemas."""

from datetime import datetime

from pydantic import BaseModel, Field


class StorageDocumentResponse(BaseModel):
    id: int
    uuid: str
    original_filename: str
    mime_type: str
    extension: str
    size_bytes: int
    category: str
    resource_type: str
    resource_id: int | None = None
    has_thumbnail: bool
    is_public: bool
    scan_status: str
    scan_result: str | None = None
    status: str = "approved"
    moderated_by_id: int | None = None
    moderated_at: datetime | None = None
    uploaded_by: int | None = None
    uploader_name: str | None = None
    created_at: datetime


class StorageDocumentAdminResponse(StorageDocumentResponse):
    storage_backend: str
    storage_path: str
    checksum_sha256: str | None = None
    deleted_at: datetime | None = None


class UploadResponse(BaseModel):
    """Response after a successful upload."""
    file: StorageDocumentResponse


class UploadMultipleResponse(BaseModel):
    """Response after uploading multiple files."""
    files: list[StorageDocumentResponse]
    errors: list[str] = []


class QuotaResponse(BaseModel):
    used_bytes: int
    max_bytes: int  # 0 = unlimited
    file_count: int


class AdminStatsResponse(BaseModel):
    total_files: int
    total_size_bytes: int
    unique_uploaders: int
    pending_moderation: int = 0


class FileStoragePolicyResponse(BaseModel):
    resource_type: str
    requires_moderation: bool
    updated_at: datetime
    updated_by_id: int | None = None


class FileStoragePolicyUpdate(BaseModel):
    requires_moderation: bool


class UploadParams(BaseModel):
    """Query/form params for upload context."""
    resource_type: str = Field("general", max_length=100)
    resource_id: int | None = None
    category: str = Field("document", pattern=r"^(avatar|document|image|attachment)$")
    is_public: bool = False
