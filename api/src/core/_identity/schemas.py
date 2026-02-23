"""Core schemas: Auth, User, Role, Permission, Feature, Invitation, Impersonation."""

from datetime import datetime

from pydantic import BaseModel, EmailStr

from ..rgpd.schemas import PendingLegalAcceptance

# ── Auth ─────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str = ""
    refresh_token: str = ""
    token_type: str = "bearer"
    must_change_password: bool = False
    preferences: dict | None = None
    mfa_required: bool = False
    mfa_token: str | None = None
    mfa_methods: list[str] | None = None
    mfa_setup_required: bool = False
    mfa_grace_period_expires: str | None = None
    email_verification_required: bool = False
    email_verification_email: str | None = None
    debug_code: str | None = None


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


class RegisterResponse(BaseModel):
    message: str
    email: str
    email_verification_required: bool = False
    debug_code: str | None = None


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class VerifyTokenRequest(BaseModel):
    token: str


# ── User ─────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    password: str | None = None
    first_name: str
    last_name: str
    auth_source: str = "local"
    must_change_password: bool = False


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    first_name: str | None = None
    last_name: str | None = None
    is_active: bool | None = None
    must_change_password: bool | None = None


class ProfileUpdate(BaseModel):
    email: EmailStr | None = None
    first_name: str | None = None
    last_name: str | None = None


class UserResponse(BaseModel):
    id: int
    uuid: str | None = None
    email: str
    first_name: str
    last_name: str
    auth_source: str
    is_active: bool
    must_change_password: bool
    preferences: dict | None = None
    last_login: datetime | None = None
    last_active: datetime | None = None
    created_at: datetime
    pending_legal_acceptances: list[PendingLegalAcceptance] = []
    has_previous_acceptances: bool = False

    model_config = {"from_attributes": True}


class RoleBasic(BaseModel):
    id: int
    slug: str
    name: str
    description: str | None = None
    color: str | None = None

    model_config = {"from_attributes": True}


class ResolvedPermission(BaseModel):
    permission_id: int
    code: str
    label: str | None = None
    description: str | None = None
    feature: str
    effective: bool
    source: str  # "user" | "role" | "global" | "none"
    user_override: bool | None = None
    role_granted: bool | None = None
    global_granted: bool | None = None


class UserDetailResponse(UserResponse):
    roles: list[RoleBasic] = []
    resolved_permissions: list[ResolvedPermission] = []


class UserRolesUpdateRequest(BaseModel):
    role_ids: list[int]


class UserPermissionOverrideRequest(BaseModel):
    permission_id: int
    granted: bool


class UserListItem(UserResponse):
    roles: list[RoleBasic] = []
    is_impersonation_immune: bool = False


class UserPaginatedResponse(BaseModel):
    items: list[UserResponse]
    total: int
    page: int
    per_page: int
    pages: int


class UserListPaginatedResponse(BaseModel):
    items: list[UserListItem]
    total: int
    page: int
    per_page: int
    pages: int


# ── Role ─────────────────────────────────────────────────────────────────

class RoleCreate(BaseModel):
    name: str
    slug: str | None = None
    description: str | None = None
    color: str | None = None


class RoleUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    color: str | None = None


class RoleResponse(BaseModel):
    id: int
    slug: str
    name: str
    description: str | None = None
    color: str | None = None
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


class PermissionWithGranted(BaseModel):
    id: int
    code: str
    feature: str
    label: str | None = None
    description: str | None = None
    granted: bool

    model_config = {"from_attributes": True}


class PermissionWithGrantedPaginated(BaseModel):
    items: list[PermissionWithGranted]
    total: int
    page: int
    per_page: int
    pages: int


class TogglePermissionRequest(BaseModel):
    permission_id: int


# ── Feature ──────────────────────────────────────────────────────────────

class FeatureResponse(BaseModel):
    name: str
    label: str
    description: str
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


# ── App Settings ────────────────────────────────────────────────────────

class AppSettingResponse(BaseModel):
    key: str
    value: str | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class AppSettingsUpdate(BaseModel):
    settings: dict[str, str | None]


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


# ── Command Execution ───────────────────────────────────────────────────

class CommandExecutionResponse(BaseModel):
    id: int
    command_name: str
    command_label: str
    feature: str
    status: str
    result: dict | None = None
    error_message: str | None = None
    duration_seconds: float
    source: str
    executed_by: int | None = None
    executed_by_name: str | None = None
    executed_at: datetime


# ── Search ──────────────────────────────────────────────────────────────

class UserSearchResult(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    full_name: str
    is_active: bool
