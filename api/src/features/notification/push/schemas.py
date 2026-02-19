"""Push notification schemas."""

from datetime import datetime

from pydantic import BaseModel


class PushSubscribeRequest(BaseModel):
    endpoint: str
    p256dh: str
    auth: str
    browser: str | None = None


class PushSubscriptionResponse(BaseModel):
    id: int
    endpoint: str
    browser: str | None = None
    is_active: bool
    created_at: datetime


class PushStatusResponse(BaseModel):
    has_active_subscriptions: bool
    subscription_count: int
    subscriptions: list[PushSubscriptionResponse]


class VapidKeyResponse(BaseModel):
    vapid_public_key: str
