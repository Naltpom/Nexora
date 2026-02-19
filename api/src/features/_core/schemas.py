"""Core schemas: Auth, User, Role, Permission, Feature, Invitation, Impersonation."""

from datetime import datetime

from pydantic import BaseModel, EmailStr


# ── Auth ─────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    must_change_password: bool = False
    preferences: dict | None = None


class RefreshRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    current_password: str | None = None
    new_password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class VerifyTokenRequest(BaseModel):
    token: str


# ── User ─────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    password: str | None = None
    first_name: str
    last_name: str
    auth_source: str = "local"
    is_super_admin: bool = False
    must_change_password: bool = False


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    first_name: str | None = None
    last_name: str | None = None
    is_active: bool | None = None
    is_super_admin: bool | None = None
    must_change_password: bool | None = None


class UserResponse(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    auth_source: str
    is_active: bool
    is_super_admin: bool
    must_change_password: bool
    preferences: dict | None = None
    last_login: datetime | None = None
    last_active: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserPaginatedResponse(BaseModel):
    items: list[UserResponse]
    total: int
    page: int
    per_page: int
    pages: int


# ── Role ─────────────────────────────────────────────────────────────────

class RoleCreate(BaseModel):
    name: str
    description: str | None = None


class RoleUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class RoleResponse(BaseModel):
    id: int
    name: str
    description: str | None = None
    permissions: list[str] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Permission ───────────────────────────────────────────────────────────

class PermissionResponse(BaseModel):
    id: int
    code: str
    feature: str
    label: str | None = None
    description: str | None = None

    model_config = {"from_attributes": True}


class AssignPermissionsRequest(BaseModel):
    permission_ids: list[int]


class UserPermissionOverride(BaseModel):
    permission_id: int
    granted: bool


class GlobalPermissionSet(BaseModel):
    permission_id: int
    granted: bool


# ── Feature ──────────────────────────────────────────────────────────────

class FeatureResponse(BaseModel):
    name: str
    label: str
    description: str
    version: str
    parent: str | None = None
    children: list[str] = []
    depends: list[str] = []
    permissions: list[str] = []
    is_core: bool
    active: bool
    has_routes: bool


class FeatureToggleRequest(BaseModel):
    active: bool


# ── Invitation ───────────────────────────────────────────────────────────

class InvitationCreate(BaseModel):
    email: EmailStr


class InvitationListResponse(BaseModel):
    id: int
    email: str
    invited_by_name: str | None = None
    created_at: datetime
    expires_at: datetime

    model_config = {"from_attributes": True}


class InvitationValidateResponse(BaseModel):
    invited_by_name: str | None = None
    email: str
    user_exists: bool
    expires_at: datetime


class InvitationAccept(BaseModel):
    password: str
    first_name: str | None = None
    last_name: str | None = None


class InvitationVerify(BaseModel):
    code: str


class InvitationTokenResponse(BaseModel):
    access_token: str
    refresh_token: str


# ── Impersonation ────────────────────────────────────────────────────────

class ImpersonationStartResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    impersonated_user_id: int
    impersonated_user_email: str
    session_id: str
    expires_in_minutes: int = 120


class ImpersonationStopResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    message: str = "Impersonation terminée"


class ImpersonationStatusResponse(BaseModel):
    is_impersonating: bool
    target_user_id: int | None = None
    target_user_name: str | None = None
    original_admin_id: int | None = None
    session_id: str | None = None
    started_at: datetime | None = None


class ImpersonationLogResponse(BaseModel):
    id: int
    session_id: str
    admin_user_id: int
    admin_user_name: str
    target_user_id: int
    target_user_name: str
    started_at: datetime
    ended_at: datetime | None
    actions_count: int
    duration_minutes: int | None


class UserSearchResult(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    full_name: str
    is_active: bool
