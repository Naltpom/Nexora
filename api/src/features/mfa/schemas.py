from datetime import datetime

from pydantic import BaseModel


class MFAStatusResponse(BaseModel):
    is_mfa_enabled: bool
    methods: list[dict]
    backup_codes_remaining: int
    mfa_required_by_policy: bool
    mfa_setup_required: bool = False
    grace_period_expires: datetime | None = None


class MFAMethodInfo(BaseModel):
    name: str
    label: str
    enabled: bool


class MFAMethodsResponse(BaseModel):
    methods: list[MFAMethodInfo]


class TOTPSetupResponse(BaseModel):
    secret: str
    qr_code_uri: str
    qr_code_base64: str


class TOTPVerifySetupRequest(BaseModel):
    code: str


class EmailOTPSendResponse(BaseModel):
    message: str
    expires_in_seconds: int


class MFAVerifyRequest(BaseModel):
    mfa_token: str
    code: str
    method: str = "totp"  # "totp", "email", or "backup"


class MFAVerifyResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    must_change_password: bool = False
    preferences: dict | None = None


class MFADisableRequest(BaseModel):
    password: str


class BackupCodesResponse(BaseModel):
    codes: list[str]
    generated_at: datetime


class MFAPolicyRequest(BaseModel):
    mfa_required: bool
    allowed_methods: list[str] | None = None
    grace_period_days: int = 7


class MFAPolicyResponse(BaseModel):
    role_id: int
    role_name: str
    mfa_required: bool
    allowed_methods: list[str] | None
    grace_period_days: int
    created_at: datetime
    updated_at: datetime
