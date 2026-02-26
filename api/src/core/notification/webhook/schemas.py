"""Webhook schemas."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel

WebhookFormat = Literal["custom", "slack", "discord"]


class WebhookCreate(BaseModel):
    name: str | None = None
    url: str
    secret: str | None = None
    format: WebhookFormat = "custom"
    prefix: str | None = None
    event_types: list[str] | None = None
    notification_rule_ids: list[int] | None = None


class WebhookUpdate(BaseModel):
    name: str | None = None
    url: str | None = None
    secret: str | None = None
    format: WebhookFormat | None = None
    prefix: str | None = None
    is_active: bool | None = None
    event_types: list[str] | None = None
    notification_rule_ids: list[int] | None = None


class WebhookResponse(BaseModel):
    id: int
    name: str | None = None
    url: str
    format: WebhookFormat = "custom"
    prefix: str | None = None
    is_active: bool
    is_global: bool
    event_types: list[str] | None = None
    notification_rule_ids: list[int] | None = None
    created_at: datetime
