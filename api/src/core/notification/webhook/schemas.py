"""Webhook schemas."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, field_validator

WebhookFormat = Literal["custom", "slack", "discord"]


class WebhookCreate(BaseModel):
    name: str | None = None
    url: str
    secret: str | None = None
    format: WebhookFormat = "custom"
    prefix: str | None = None
    event_types: list[str] | None = None
    notification_rule_ids: list[int] | None = None

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        if not v.startswith(("http://", "https://")):
            raise ValueError("URL must start with http:// or https://")
        return v


class WebhookUpdate(BaseModel):
    name: str | None = None
    url: str | None = None
    secret: str | None = None
    format: WebhookFormat | None = None
    prefix: str | None = None
    is_active: bool | None = None
    event_types: list[str] | None = None
    notification_rule_ids: list[int] | None = None

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str | None) -> str | None:
        if v is not None and not v.startswith(("http://", "https://")):
            raise ValueError("URL must start with http:// or https://")
        return v


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
