"""Webhook schemas."""

from datetime import datetime

from pydantic import BaseModel


class WebhookCreate(BaseModel):
    name: str | None = None
    url: str
    secret: str | None = None
    format: str = "custom"  # custom, slack, discord
    prefix: str | None = None
    event_types: list[str] | None = None
    notification_rule_ids: list[int] | None = None


class WebhookUpdate(BaseModel):
    name: str | None = None
    url: str | None = None
    secret: str | None = None
    format: str | None = None
    prefix: str | None = None
    is_active: bool | None = None
    event_types: list[str] | None = None
    notification_rule_ids: list[int] | None = None


class WebhookResponse(BaseModel):
    id: int
    name: str | None = None
    url: str
    format: str = "custom"
    prefix: str | None = None
    is_active: bool
    is_global: bool
    event_types: list[str] | None = None
    notification_rule_ids: list[int] | None = None
    created_at: datetime
