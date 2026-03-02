"""Maintenance mode schemas."""

from datetime import datetime

from pydantic import BaseModel


class MaintenanceStatusResponse(BaseModel):
    """Public status response (no auth required)."""
    is_active: bool
    message: str | None = None
    scheduled_end: datetime | None = None


class MaintenanceWindowResponse(BaseModel):
    """Admin-facing window details."""
    id: int
    is_active: bool
    message: str | None = None
    scheduled_start: datetime
    scheduled_end: datetime | None = None
    bypass_roles: list[str]
    created_by_id: int | None = None
    created_by_name: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MaintenanceActivate(BaseModel):
    """Request body for immediate activation."""
    message: str | None = None
    bypass_roles: list[str] = ["super_admin", "admin"]


class MaintenanceSchedule(BaseModel):
    """Request body for scheduling a maintenance window."""
    message: str | None = None
    scheduled_start: datetime
    scheduled_end: datetime | None = None
    bypass_roles: list[str] = ["super_admin", "admin"]
