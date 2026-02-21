"""Auth endpoints: login, refresh, me, preferences, change-password,
forgot-password, reset-password, register, verify-email."""

import json
import random
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..database import get_db
from ..permissions import get_user_permission_codes
from ..security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    hash_password,
    verify_password,
)
from .models import User
from .schemas import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    RegisterResponse,
    ResendVerificationRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserResponse,
    VerifyEmailRequest,
    VerifyTokenRequest,
)
from ..events import event_bus
from .services import (
    authenticate_user,
    create_security_token,
    verify_security_token,
    consume_security_token,
    get_latest_security_token,
)

router = APIRouter()


# ---------------------------------------------------------------------------
#  Login / Refresh
# ---------------------------------------------------------------------------


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await authenticate_user(db, request.email, request.password)
    return TokenResponse(**result)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(request.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de rafraichissement invalide",
        )
    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur introuvable",
        )
    token_data = {"sub": str(user.id), "email": user.email}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


# ---------------------------------------------------------------------------
#  Current user
# ---------------------------------------------------------------------------


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user=Depends(get_current_user),
    permission_codes: list[str] = Depends(get_user_permission_codes),
):
    preferences = None
    if current_user.preferences:
        try:
            preferences = json.loads(current_user.preferences)
        except (json.JSONDecodeError, TypeError):
            preferences = None

    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        auth_source=current_user.auth_source,
        is_active=current_user.is_active,
        is_super_admin=current_user.is_super_admin,
        must_change_password=current_user.must_change_password,
        preferences=preferences,
        last_login=current_user.last_login,
        last_active=current_user.last_active,
        created_at=current_user.created_at,
    )


@router.get("/me/permissions")
async def get_my_permissions(
    permission_codes: list[str] = Depends(get_user_permission_codes),
):
    return {"permissions": permission_codes}


# ---------------------------------------------------------------------------
#  Preferences
# ---------------------------------------------------------------------------


@router.get("/me/preferences")
async def get_preferences(current_user=Depends(get_current_user)):
    if current_user.preferences:
        try:
            return json.loads(current_user.preferences)
        except (json.JSONDecodeError, TypeError):
            return {}
    return {}


@router.put("/me/preferences")
async def update_preferences(
    prefs: dict = Body(...),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one_or_none()
    existing: dict = {}
    if user.preferences:
        try:
            existing = json.loads(user.preferences)
        except (json.JSONDecodeError, TypeError):
            existing = {}
    existing.update(prefs)
    user.preferences = json.dumps(existing)
    await db.flush()
    return existing


# ---------------------------------------------------------------------------
#  Password management
# ---------------------------------------------------------------------------


@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one_or_none()

    if user.password_hash and not user.must_change_password:
        if not request.current_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Le mot de passe actuel est requis",
            )
        if not verify_password(request.current_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mot de passe actuel incorrect",
            )

    if len(request.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le mot de passe doit contenir au moins 6 caracteres",
        )

    user.password_hash = hash_password(request.new_password)
    user.must_change_password = False
    await db.flush()
    return {"message": "Mot de passe modifie avec succes"}


@router.post("/forgot-password")
async def forgot_password(
    request: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint -- sends a password reset email if the user exists and is local."""
    email = request.email.lower()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user and user.auth_source == "local":
        token = str(uuid.uuid4())
        await create_security_token(db, user.id, "password_reset", token, expires_minutes=30)

        try:
            from ..notification.email.services import get_email_sender

            sender = get_email_sender()
            sender.send_reset_password(
                to_email=user.email,
                to_name=f"{user.first_name} {user.last_name}",
                reset_token=token,
                initiated_by_user=True,
            )
        except Exception:
            pass

    # Always return success to prevent email enumeration
    return {"message": "Si cette adresse existe dans notre systeme, un email a ete envoye."}


@router.post("/reset-password")
async def reset_password(
    request: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint -- validates token and sets new password."""
    if len(request.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le mot de passe doit contenir au moins 6 caracteres",
        )

    token = await verify_security_token(db, request.token, "password_reset")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token de reinitialisation invalide ou expire",
        )

    result = await db.execute(select(User).where(User.id == token.user_id))
    target_user = result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Utilisateur introuvable",
        )

    target_user.password_hash = hash_password(request.new_password)
    target_user.must_change_password = False
    await consume_security_token(db, token)
    return {"message": "Mot de passe modifie avec succes"}


@router.post("/verify-reset-token")
async def verify_reset_token_endpoint(
    request: VerifyTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint -- verifies if a reset token is valid without consuming it."""
    token = await verify_security_token(db, request.token, "password_reset")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token de reinitialisation invalide ou expire",
        )

    result = await db.execute(select(User).where(User.id == token.user_id))
    user = result.scalar_one_or_none()
    return {"valid": True, "email": user.email if user else None}


# ---------------------------------------------------------------------------
#  Register
# ---------------------------------------------------------------------------


def _generate_verification_code() -> str:
    return str(random.randint(100000, 999999))


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    data: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    email = data.email.lower()
    result = await db.execute(select(User).where(User.email == email))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Un utilisateur avec cet email existe deja")

    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 6 caracteres")

    user = User(
        email=email,
        password_hash=hash_password(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        auth_source="local",
        is_active=True,
        email_verified=False,
    )
    db.add(user)
    await db.flush()

    code = _generate_verification_code()
    await create_security_token(db, user.id, "email_verification", code, expires_minutes=5)

    if settings.EMAIL_ENABLED:
        try:
            from ..notification.email.services import get_email_sender

            sender = get_email_sender()
            sender.send_verification_code(
                to_email=user.email,
                to_name=user.first_name,
                verification_code=code,
            )
        except Exception:
            pass

    # Emit event (non-blocking — errors are logged, never propagated)
    await event_bus.emit(
        "user.registered",
        db=db,
        actor_id=user.id,
        resource_type="user",
        resource_id=user.id,
        payload={
            "actor_name": f"{user.first_name} {user.last_name}",
            "user_name": f"{user.first_name} {user.last_name}",
            "email": user.email,
        },
    )

    return RegisterResponse(
        message="Code de verification envoye par email",
        email=user.email,
        email_verification_required=True,
        debug_code=code if not settings.EMAIL_ENABLED else None,
    )


# ---------------------------------------------------------------------------
#  Email verification
# ---------------------------------------------------------------------------


@router.post("/verify-email", response_model=TokenResponse)
async def verify_email(
    data: VerifyEmailRequest,
    db: AsyncSession = Depends(get_db),
):
    """Verify email with 6-digit code after registration."""
    email = data.email.lower()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=400, detail="Utilisateur introuvable")
    if user.email_verified:
        raise HTTPException(status_code=400, detail="Email deja verifie")

    token = await verify_security_token(db, data.code, "email_verification", user_id=user.id)
    if not token:
        raise HTTPException(status_code=400, detail="Code incorrect ou expire")

    user.email_verified = True
    await consume_security_token(db, token)

    token_data = {"sub": str(user.id), "email": user.email}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


@router.post("/resend-verification")
async def resend_verification(
    data: ResendVerificationRequest,
    db: AsyncSession = Depends(get_db),
):
    """Resend verification code with 60s cooldown."""
    email = data.email.lower()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user or user.email_verified:
        return {"message": "Si cette adresse necessite une verification, un code a ete envoye."}

    # Cooldown check
    latest = await get_latest_security_token(db, user.id, "email_verification")
    if latest:
        elapsed = (datetime.now(timezone.utc) - latest.created_at).total_seconds()
        if elapsed < 60:
            remaining = int(60 - elapsed)
            raise HTTPException(
                status_code=429,
                detail=f"Veuillez attendre {remaining} secondes avant de renvoyer un code",
            )

    code = _generate_verification_code()
    await create_security_token(db, user.id, "email_verification", code, expires_minutes=5)

    if settings.EMAIL_ENABLED:
        try:
            from ..notification.email.services import get_email_sender

            sender = get_email_sender()
            sender.send_verification_code(
                to_email=user.email,
                to_name=user.first_name,
                verification_code=code,
            )
        except Exception:
            pass

    return {
        "message": "Si cette adresse necessite une verification, un code a ete envoye.",
        "debug_code": code if not settings.EMAIL_ENABLED else None,
    }
