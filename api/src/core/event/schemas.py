"""Event feature schemas."""

from pydantic import BaseModel


class EventTypeResponse(BaseModel):
    event_type: str
    label: str
    category: str
    description: str | None = None
    admin_only: bool = False
    feature: str
