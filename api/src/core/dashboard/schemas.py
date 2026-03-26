"""Dashboard schemas."""

from datetime import datetime

from pydantic import BaseModel


class WidgetConfig(BaseModel):
    widget_id: str
    position: int
    size: str = "half"
    height: int = 1  # 1-5 rows
    config: dict | None = None


class LayoutResponse(BaseModel):
    widgets: list[WidgetConfig]
    source: str  # "user", "role", "default"
    full_width: bool = False


class LayoutSave(BaseModel):
    widgets: list[WidgetConfig]
    full_width: bool = False


class WidgetDefinitionResponse(BaseModel):
    id: str
    label: str
    description: str
    category: str
    default_size: str
    default_height: int = 1
    icon: str | None = None
    data_endpoint: str | None = None


class SystemHealthData(BaseModel):
    db_status: str
    uptime_seconds: float
    active_users_24h: int
    total_users: int
    total_features: int
    active_features: int


class ActivityItem(BaseModel):
    id: int
    event_type: str
    actor_email: str
    resource_type: str | None = None
    resource_id: int | None = None
    created_at: datetime
