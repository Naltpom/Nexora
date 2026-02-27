"""Lifecycle feature Pydantic schemas."""

from pydantic import BaseModel


class LifecycleDashboardUser(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    last_active: str | None = None
    archived_at: str | None = None
    days_until_action: int


class LifecycleDashboardResponse(BaseModel):
    total_active: int
    total_archived: int
    inactivity_days: int
    archive_days: int
    soon_to_archive: list[LifecycleDashboardUser]
    archived_users: list[LifecycleDashboardUser]


class LifecycleSettingsResponse(BaseModel):
    inactivity_days: int
    archive_days: int


class ReactivateResponse(BaseModel):
    user_id: int
    email: str
    message: str
