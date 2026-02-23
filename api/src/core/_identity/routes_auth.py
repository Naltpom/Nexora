"""Auth endpoints: login, refresh, me, preferences, change-password,
forgot-password, reset-password, register, verify-email."""

import random
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Body, Depends, HTTPException, Request, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..database import get_db
from ..events import event_bus
from ..permissions import get_user_permission_codes
from ..rate_limit import limiter, login_limiter
from ..security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from .models import User, UserSession
from .schemas import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    ProfileUpdate,
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
from .services import (
    authenticate_user,
    consume_security_token,
    create_security_token,
    get_latest_security_token,
    verify_security_token,
)

router = APIRouter()


async def _create_session(
    db: AsyncSession,
    user_id: int,
    refresh_token: str,
    req: Request | None = None,
) -> None:
    """Create a user session record for refresh token tracking."""
    session = UserSession(
        user_id=user_id,
        refresh_token_hash=hash_refresh_token(refresh_token),
        ip_address=req.client.host if req and req.client else None,
        user_agent=(req.headers.get("user-agent", "")[:500]) if req else None,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(session)


# ---------------------------------------------------------------------------
#  Login / Refresh
# ---------------------------------------------------------------------------


@router.post("/login", response_model=TokenResponse)
@limiter.limit(settings.RATE_LIMIT_LOGIN)
async def login(data: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    ip = request.client.host if request.client else "unknown"

    # -- Brute-force rate limit check (email + IP tracking) -------------
    allowed, retry_after = login_limiter.check(data.email, ip)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Trop de tentatives. Réessayez dans {retry_after} secondes.",
            headers={"Retry-After": str(retry_after)},
        )

    try:
        result = await authenticate_user(db, data.email, data.password)
    except HTTPException:
        login_limiter.record_failure(data.email, ip)
        raise

    login_limiter.record_success(data.email)

    # Create session if tokens were issued
    if result.get("refresh_token"):
        token_payload = decode_token(result["access_token"])
        user_id = int(token_payload.get("sub", 0))
        if user_id:
            await _create_session(db, user_id, result["refresh_token"], request)
            await db.flush()
    return TokenResponse(**result)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: RefreshRequest, req: Request, db: AsyncSession = Depends(get_db),
):
    payload = decode_token(request.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de rafraichissement invalide",
        )
    user_id = int(payload.get("sub", 0))

    # Look up session by token hash (FOR UPDATE prevents concurrent reuse)
    old_hash = hash_refresh_token(request.refresh_token)
    sess_result = await db.execute(
        select(UserSession)
        .where(UserSession.refresh_token_hash == old_hash)
        .with_for_update()
    )
    old_session = sess_result.scalar_one_or_none()

    if old_session:
        if old_session.is_revoked:
            # Token reuse detected — revoke ALL sessions for this user
            await db.execute(
                update(UserSession)
                .where(UserSession.user_id == old_session.user_id, UserSession.is_revoked.is_(False))
                .values(is_revoked=True)
            )
            await db.flush()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token reutilise — toutes les sessions ont ete revoquees",
            )
        # Revoke the old session
        old_session.is_revoked = True

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active or user.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur introuvable",
        )

    token_data = {"sub": str(user.id), "email": user.email, "lang": user.language}
    new_refresh = create_refresh_token(token_data)

    # Create new session
    await _create_session(db, user.id, new_refresh, req)
    await db.flush()

    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=new_refresh,
    )


# ---------------------------------------------------------------------------
#  Current user
# ---------------------------------------------------------------------------


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user=Depends(get_current_user),
    permission_codes: list[str] = Depends(get_user_permission_codes),
    db: AsyncSession = Depends(get_db),
):
    from ..rgpd.routes_politique import get_pending_acceptances_for_user

    pending, has_previous = await get_pending_acceptances_for_user(
        db, current_user.id, user_created_at=current_user.created_at,
    )
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        auth_source=current_user.auth_source,
        is_active=current_user.is_active,
        must_change_password=current_user.must_change_password,
        preferences=current_user.preferences,
        last_login=current_user.last_login,
        last_active=current_user.last_active,
        created_at=current_user.created_at,
        pending_legal_acceptances=pending,
        has_previous_acceptances=has_previous,
    )


@router.get("/me/permissions")
async def get_my_permissions(
    permission_codes: list[str] = Depends(get_user_permission_codes),
):
    return {"permissions": permission_codes}


@router.put("/me", response_model=UserResponse)
async def update_me(
    data: ProfileUpdate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one()

    if data.email is not None and data.email != user.email:
        existing = await db.execute(select(User).where(User.email == data.email))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cet email est deja utilise")
        user.email = data.email
    if data.first_name is not None:
        user.first_name = data.first_name
    if data.last_name is not None:
        user.last_name = data.last_name

    await db.flush()

    from ..rgpd.routes_politique import get_pending_acceptances_for_user
    pending, has_previous = await get_pending_acceptances_for_user(
        db, user.id, user_created_at=user.created_at,
    )
    return UserResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        auth_source=user.auth_source,
        is_active=user.is_active,
        must_change_password=user.must_change_password,
        preferences=user.preferences,
        last_login=user.last_login,
        last_active=user.last_active,
        created_at=user.created_at,
        pending_legal_acceptances=pending,
        has_previous_acceptances=has_previous,
    )


# ---------------------------------------------------------------------------
#  Preferences
# ---------------------------------------------------------------------------


@router.get("/me/preferences")
async def get_preferences(current_user=Depends(get_current_user)):
    return current_user.preferences or {}


@router.put("/me/preferences")
async def update_preferences(
    prefs: dict = Body(...),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one_or_none()
    from sqlalchemy.orm.attributes import flag_modified
    existing: dict = user.preferences or {}
    existing.update(prefs)
    user.preferences = existing
    flag_modified(user, "preferences")
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
@limiter.limit(settings.RATE_LIMIT_FORGOT_PASSWORD)
async def forgot_password(
    data: ForgotPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint -- sends a password reset email if the user exists and is local."""
    email = data.email.lower()
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
@limiter.limit(settings.RATE_LIMIT_RESET_PASSWORD)
async def reset_password(
    data: ResetPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint -- validates token and sets new password."""
    if len(data.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le mot de passe doit contenir au moins 6 caracteres",
        )

    token = await verify_security_token(db, data.token, "password_reset")
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

    target_user.password_hash = hash_password(data.new_password)
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
@limiter.limit(settings.RATE_LIMIT_REGISTER)
async def register(
    data: RegisterRequest,
    request: Request,
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
@limiter.limit("5/minute")
async def verify_email(
    data: VerifyEmailRequest,
    request: Request,
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

    token_data = {"sub": str(user.id), "email": user.email, "lang": user.language}
    refresh = create_refresh_token(token_data)
    await _create_session(db, user.id, refresh, request)
    await db.flush()

    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=refresh,
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


# ---------------------------------------------------------------------------
#  Session management
# ---------------------------------------------------------------------------


@router.get("/me/sessions")
async def list_my_sessions(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List active (non-revoked, non-expired) sessions for the current user."""
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(UserSession)
        .where(
            UserSession.user_id == current_user.id,
            UserSession.is_revoked.is_(False),
            UserSession.expires_at > now,
        )
        .order_by(UserSession.last_used_at.desc())
    )
    sessions = result.scalars().all()
    return [
        {
            "id": s.id,
            "ip_address": s.ip_address,
            "user_agent": s.user_agent,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "last_used_at": s.last_used_at.isoformat() if s.last_used_at else None,
            "expires_at": s.expires_at.isoformat() if s.expires_at else None,
        }
        for s in sessions
    ]


@router.delete("/me/sessions/{session_id}", status_code=204)
async def revoke_session(
    session_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Revoke a specific session."""
    result = await db.execute(
        select(UserSession).where(
            UserSession.id == session_id,
            UserSession.user_id == current_user.id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session introuvable")
    session.is_revoked = True
    await db.flush()


@router.delete("/me/sessions", status_code=204)
async def revoke_all_sessions(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Revoke all sessions for the current user."""
    await db.execute(
        update(UserSession)
        .where(UserSession.user_id == current_user.id, UserSession.is_revoked.is_(False))
        .values(is_revoked=True)
    )
    await db.flush()


# ---------------------------------------------------------------------------
#  Account self-deletion (soft delete with reactivation window)
# ---------------------------------------------------------------------------


@router.delete("/me/account")
async def delete_my_account(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete the current user's account.

    The account is deactivated but not purged. If the user logs in again
    within the reactivation window (default 30 days), the account is
    automatically reactivated. After that period, the scheduled purge
    command hard-deletes the data.
    """
    now = datetime.now(timezone.utc)
    current_user.deleted_at = now
    current_user.is_active = False
    # Do NOT anonymize email — allow reactivation by login
    # Email anonymization happens on hard-delete (purge command)

    # Revoke all sessions
    await db.execute(
        update(UserSession)
        .where(UserSession.user_id == current_user.id, UserSession.is_revoked.is_(False))
        .values(is_revoked=True)
    )
    await db.flush()

    return {
        "message": "Votre compte a ete desactive. Vous pouvez le reactiver en vous reconnectant dans les 30 jours.",
    }
