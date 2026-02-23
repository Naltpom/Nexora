"""Event feature schemas."""

from datetime import datetime

from pydantic import BaseModel


class EventTypeResponse(BaseModel):
    event_type: str
    label: str
    category: str
    description: str | None = None
    feature: str


class EventListItem(BaseModel):
    id: int
    event_type: str
    actor_id: int
    actor_email: str
    resource_type: str
    resource_id: int
    payload: dict
    created_at: datetime


class EventListPaginatedResponse(BaseModel):
    items: list[EventListItem]
    total: int
    page: int
    per_page: int
    pages: int
