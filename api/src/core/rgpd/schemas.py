"""RGPD Pydantic schemas for request/response validation."""

from datetime import datetime

from pydantic import BaseModel


# --- Consent ---


class ConsentInput(BaseModel):
    consent_type: str
    granted: bool


class ConsentBulkInput(BaseModel):
    consents: list[ConsentInput]


class ConsentResponse(BaseModel):
    id: int
    user_id: int | None = None
    consent_type: str
    granted: bool
    ip_address: str | None = None
    created_at: datetime


class ConsentListResponse(BaseModel):
    items: list[ConsentResponse]
    total: int
    page: int
    per_page: int
    pages: int


class UserConsentSummary(BaseModel):
    necessary: bool
    functional: bool
    analytics: bool
    marketing: bool
    updated_at: datetime | None = None


# --- Processing Register ---


class RegisterEntryCreate(BaseModel):
    name: str
    purpose: str
    legal_basis: str
    data_categories: str
    data_subjects: str
    recipients: str | None = None
    retention_period: str
    security_measures: str | None = None


class RegisterEntryUpdate(BaseModel):
    name: str | None = None
    purpose: str | None = None
    legal_basis: str | None = None
    data_categories: str | None = None
    data_subjects: str | None = None
    recipients: str | None = None
    retention_period: str | None = None
    security_measures: str | None = None
    is_active: bool | None = None


class RegisterEntryResponse(BaseModel):
    id: int
    name: str
    purpose: str
    legal_basis: str
    data_categories: str
    data_subjects: str
    recipients: str | None = None
    retention_period: str
    security_measures: str | None = None
    is_active: bool
    created_by_id: int | None = None
    created_at: datetime
    updated_at: datetime


class RegisterListResponse(BaseModel):
    items: list[RegisterEntryResponse]
    total: int


# --- Rights Requests ---


class RightsRequestCreate(BaseModel):
    request_type: str
    description: str | None = None


class RightsRequestAdminUpdate(BaseModel):
    status: str
    admin_response: str | None = None


class RightsRequestResponse(BaseModel):
    id: int
    user_id: int
    user_email: str | None = None
    user_name: str | None = None
    request_type: str
    status: str
    description: str | None = None
    admin_response: str | None = None
    processed_by_id: int | None = None
    completed_at: datetime | None = None
    created_at: datetime


class RightsRequestListResponse(BaseModel):
    items: list[RightsRequestResponse]
    total: int
    page: int
    per_page: int
    pages: int


# --- Export ---


class DataPreviewSection(BaseModel):
    section: str
    count: int
    fields: list[str]


class DataPreviewResponse(BaseModel):
    user_email: str
    sections: list[DataPreviewSection]
    generated_at: datetime


# --- Legal Pages ---


class LegalPageUpdate(BaseModel):
    title: str
    content_html: str
    is_published: bool = True
    requires_acceptance: bool = False


class LegalPageResponse(BaseModel):
    id: int
    slug: str
    title: str
    content_html: str
    is_published: bool
    requires_acceptance: bool
    version: int
    updated_at: datetime


class LegalPageListResponse(BaseModel):
    items: list[LegalPageResponse]


class PendingLegalAcceptance(BaseModel):
    slug: str
    title: str
    version: int
    updated_at: datetime
    content_html: str


class LegalAcceptanceInput(BaseModel):
    slugs: list[str]


class CheckPendingResponse(BaseModel):
    pending: bool


class LegalPageVersionResponse(BaseModel):
    version: int
    title: str
    content_html: str
    created_at: datetime


# --- Audit Logs ---


class DataAccessLogResponse(BaseModel):
    id: int
    accessor_id: int | None = None
    accessor_email: str | None = None
    target_user_id: int | None = None
    target_user_email: str | None = None
    resource_type: str
    resource_id: str | None = None
    action: str
    details: str | None = None
    ip_address: str | None = None
    created_at: datetime


class AuditLogListResponse(BaseModel):
    items: list[DataAccessLogResponse]
    total: int
    page: int
    per_page: int
    pages: int
