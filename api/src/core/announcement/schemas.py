from datetime import datetime

from pydantic import BaseModel, Field


class AnnouncementResponse(BaseModel):
    id: int
    title: str
    body: str | None = None
    type: str
    display: str
    requires_acknowledgment: bool
    is_dismissible: bool
    priority: int
    start_date: datetime
    end_date: datetime | None = None
    created_at: datetime


class AnnouncementModalResponse(BaseModel):
    """Response for modal announcements with read status."""
    id: int
    title: str
    body: str | None = None
    type: str
    requires_acknowledgment: bool
    priority: int
    start_date: datetime
    end_date: datetime | None = None
    created_at: datetime
    is_read: bool = False


class AnnouncementAdminResponse(BaseModel):
    id: int
    title: str
    body: str | None = None
    type: str
    display: str
    requires_acknowledgment: bool
    target_roles: list[str] | None = None
    start_date: datetime
    end_date: datetime | None = None
    is_dismissible: bool
    priority: int
    is_active: bool
    created_by_id: int | None = None
    created_by_name: str | None = None
    acknowledged_count: int = 0
    target_count: int = 0
    created_at: datetime
    updated_at: datetime


class AnnouncementCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    body: str | None = None
    type: str = Field("info", pattern=r"^(info|warning|success|danger)$")
    display: str = Field("banner", pattern=r"^(banner|modal)$")
    requires_acknowledgment: bool = False
    target_roles: list[str] | None = None
    start_date: datetime
    end_date: datetime | None = None
    is_dismissible: bool = True
    priority: int = 0
    is_active: bool = True


class AnnouncementUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    body: str | None = None
    type: str | None = Field(None, pattern=r"^(info|warning|success|danger)$")
    display: str | None = Field(None, pattern=r"^(banner|modal)$")
    requires_acknowledgment: bool | None = None
    target_roles: list[str] | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    is_dismissible: bool | None = None
    priority: int | None = None
    is_active: bool | None = None


class AcknowledgmentDetail(BaseModel):
    """Detail of a user who acknowledged an announcement."""
    user_id: int
    first_name: str
    last_name: str
    email: str
    acknowledged_at: datetime
