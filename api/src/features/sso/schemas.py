"""SSO schemas: request/response models for SSO endpoints."""

from datetime import datetime

from pydantic import BaseModel


class SSOAuthorizeResponse(BaseModel):
    authorization_url: str


class SSOCallbackRequest(BaseModel):
    code: str
    state: str | None = None


class SSOCallbackResponse(BaseModel):
    access_token: str = ""
    refresh_token: str = ""
    token_type: str = "bearer"
    is_new_user: bool = False
    must_change_password: bool = False
    preferences: dict | None = None
    mfa_required: bool = False
    mfa_token: str | None = None
    mfa_methods: list[str] | None = None
    mfa_setup_required: bool = False
    mfa_grace_period_expires: str | None = None


class SSOAccountResponse(BaseModel):
    id: int
    provider: str
    provider_email: str | None
    provider_name: str | None
    provider_avatar_url: str | None
    created_at: datetime
    last_login_at: datetime | None

    model_config = {"from_attributes": True}


class SSOProviderInfo(BaseModel):
    name: str
    label: str
    enabled: bool


class SSOProvidersResponse(BaseModel):
    providers: list[SSOProviderInfo]
