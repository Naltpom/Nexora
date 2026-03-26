"""Export history feature schemas."""

from datetime import datetime

from pydantic import BaseModel


class ExportHistoryCreate(BaseModel):
    export_id: str
    export_label: str
    feature_name: str
    format: str
    params_json: str | None = None
    params_display: str | None = None
    oc_id: int | None = None
    oc_name: str | None = None


class ExportHistoryResponse(BaseModel):
    id: int
    uuid: str
    export_id: str
    export_label: str
    feature_name: str
    format: str
    params_json: str | None
    params_display: str | None
    oc_id: int | None
    oc_name: str | None
    file_size_bytes: int | None
    status: str
    error_detail: str | None
    storage_document_uuid: str | None
    user_name: str | None
    created_at: datetime


class GenerateExportRequest(BaseModel):
    """Request body for launching an async export generation."""

    export_id: str
    export_label: str
    feature_name: str
    format: str
    params_json: str | None = None
    params_display: str | None = None
    oc_id: int | None = None
    oc_name: str | None = None
    permission: str


class ExportStatusResponse(BaseModel):
    """Lightweight status check response for a pending export."""

    uuid: str
    status: str
    error_detail: str | None = None
    storage_document_uuid: str | None = None
    file_size_bytes: int | None = None
