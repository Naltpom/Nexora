"""Notification feature schemas: notifications, rules, events, user preferences."""

from datetime import datetime

from pydantic import BaseModel

# -- Notifications -------------------------------------------------------------

class NotificationResponse(BaseModel):
    id: int
    event_type: str
    title: str
    body: str | None = None
    link: str | None = None
    is_read: bool
    required_permission: str | None = None
    email_sent_at: datetime | None = None
    webhook_sent_at: datetime | None = None
    push_sent_at: datetime | None = None
    created_at: datetime


class AdminNotificationResponse(BaseModel):
    id: int
    user_id: int
    user_email: str
    user_name: str
    event_type: str
    title: str
    body: str | None = None
    link: str | None = None
    is_read: bool
    required_permission: str | None = None
    email_sent_at: datetime | None = None
    webhook_sent_at: datetime | None = None
    push_sent_at: datetime | None = None
    deleted_at: datetime | None = None
    created_at: datetime


class UnreadCountResponse(BaseModel):
    count: int


# -- Notification Rules --------------------------------------------------------

class NotificationRuleCreate(BaseModel):
    name: str
    event_types: list[str]
    target_type: str  # "all"|"users"|"self"
    target_user_ids: list[int] | None = None
    channel_in_app: bool = False
    channel_email: bool = False
    channel_webhook: bool = False
    channel_push: bool = False
    webhook_ids: list[int] | None = None
    default_in_app: bool = False
    default_email: bool = False
    default_webhook: bool = False
    default_push: bool = False
    is_default_template: bool = False


class NotificationRuleUpdate(BaseModel):
    name: str | None = None
    event_types: list[str] | None = None
    target_type: str | None = None
    target_user_ids: list[int] | None = None
    channel_in_app: bool | None = None
    channel_email: bool | None = None
    channel_webhook: bool | None = None
    channel_push: bool | None = None
    webhook_ids: list[int] | None = None
    default_in_app: bool | None = None
    default_email: bool | None = None
    default_webhook: bool | None = None
    default_push: bool | None = None
    is_default_template: bool | None = None


class UpdateRulePreferenceRequest(BaseModel):
    is_active: bool | None = None
    channel_in_app: bool | None = None
    channel_email: bool | None = None
    channel_webhook: bool | None = None
    channel_push: bool | None = None
    webhook_ids: list[int] | None = None


class UserRulePreferenceResponse(BaseModel):
    is_active: bool
    channel_in_app: bool
    channel_email: bool
    channel_webhook: bool
    channel_push: bool
    is_customized: bool
    webhook_ids: list[int] | None = None


class NotificationRuleResponse(BaseModel):
    id: int
    name: str
    created_by_id: int | None = None
    created_by_name: str | None = None
    event_types: list[str]
    target_type: str
    target_user_ids: list[int] | None = None
    channel_in_app: bool
    channel_email: bool
    channel_webhook: bool
    channel_push: bool
    webhook_ids: list[int] | None = None
    default_in_app: bool
    default_email: bool
    default_webhook: bool
    default_push: bool
    is_active: bool
    is_default_template: bool
    user_preference: UserRulePreferenceResponse | None = None
    created_at: datetime
