"""Email OTP routes: enable, verify-setup, send-code, disable."""

from datetime import datetime, timezone

from fastapi import APIRouter, Body, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..._identity.models import User
from ...config import settings
from ...database import get_db
from ...events import event_bus
from ...permissions import require_permission
from ...rate_limit import limiter
from ...security import decode_mfa_token, get_current_user
from ..models import UserMFA
from ..schemas import BackupCodesResponse, EmailDisableRequest, EmailOTPSendResponse, EmailVerifySetupRequest
from ..services import generate_backup_codes
from .services import send_email_otp, verify_email_otp

router = APIRouter()


@router.post("/enable", response_model=EmailOTPSendResponse, dependencies=[Depends(require_permission("mfa.email.setup"))])
@limiter.limit(settings.RATE_LIMIT_MFA_VERIFY)
async def email_enable(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Initier l'activation du MFA par email : envoie un code de verification."""
    # Check EMAIL_ENABLED before allowing activation
    if not settings.EMAIL_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="L'envoi d'emails n'est pas configure. Impossible d'activer le MFA par email.",
        )

    # Check if email MFA already enabled
    result = await db.execute(
        select(UserMFA).where(
            UserMFA.user_id == current_user.id,
            UserMFA.method == "email",
            UserMFA.is_enabled == True,
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA par email est deja active",
        )

    # Create or update UserMFA record (not yet enabled, pending verification)
    result = await db.execute(
        select(UserMFA).where(
            UserMFA.user_id == current_user.id,
            UserMFA.method == "email",
        )
    )
    mfa_record = result.scalar_one_or_none()

    if mfa_record:
        mfa_record.is_enabled = False
        mfa_record.email_address = current_user.email
    else:
        mfa_record = UserMFA(
            user_id=current_user.id,
            method="email",
            is_enabled=False,
            email_address=current_user.email,
        )
        db.add(mfa_record)

    await db.flush()

    # Send verification code
    result_info = await send_email_otp(
        db, current_user.id, current_user.email, f"{current_user.first_name} {current_user.last_name}"
    )

    return EmailOTPSendResponse(
        message="Code de verification envoye par email",
        **result_info,
    )


@router.post("/verify-setup", response_model=BackupCodesResponse, dependencies=[Depends(require_permission("mfa.email.setup"))])
@limiter.limit(settings.RATE_LIMIT_MFA_VERIFY)
async def email_verify_setup(
    request: Request,
    data: EmailVerifySetupRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Verifier le code email pour confirmer l'activation du MFA par email."""
    # Load UserMFA for email
    result = await db.execute(
        select(UserMFA).where(
            UserMFA.user_id == current_user.id,
            UserMFA.method == "email",
        )
    )
    mfa_record = result.scalar_one_or_none()

    if not mfa_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Veuillez d'abord initier l'activation via /enable",
        )

    if mfa_record.is_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA par email est deja active",
        )

    # Verify email OTP code
    is_valid = await verify_email_otp(db, current_user.id, data.code)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Code email invalide ou expire",
        )

    # Activate email MFA
    mfa_record.is_enabled = True

    # Check if this is the first MFA method -> make it primary
    result = await db.execute(
        select(UserMFA).where(
            UserMFA.user_id == current_user.id,
            UserMFA.is_enabled == True,
            UserMFA.method != "email",
        )
    )
    other_enabled = result.scalars().all()
    if not other_enabled:
        mfa_record.is_primary = True

    # Generate backup codes
    codes = await generate_backup_codes(db, current_user.id)

    await db.flush()

    await event_bus.emit(
        "mfa.email_enabled",
        db=db,
        actor_id=current_user.id,
        resource_type="user",
        resource_id=current_user.id,
    )

    return BackupCodesResponse(
        codes=codes,
        generated_at=datetime.now(timezone.utc),
    )


# Bug 8 fix: rate limit on send-code
@router.post("/send-code", response_model=EmailOTPSendResponse)
@limiter.limit(settings.RATE_LIMIT_MFA_VERIFY)
async def send_code(
    request: Request,
    mfa_token: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
):
    """Envoyer un code OTP par email (utilise le mfa_token du login)."""
    payload = decode_mfa_token(mfa_token)
    user_id = int(payload["sub"])

    # Fetch user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur introuvable",
        )

    result_info = await send_email_otp(
        db, user_id, user.email, f"{user.first_name} {user.last_name}"
    )
    return EmailOTPSendResponse(
        message="Code envoye par email",
        **result_info,
    )


@router.post("/send-disable-code", response_model=EmailOTPSendResponse, dependencies=[Depends(require_permission("mfa.email.setup"))])
@limiter.limit(settings.RATE_LIMIT_MFA_VERIFY)
async def send_disable_code(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Envoyer un code OTP par email pour confirmer la desactivation (authentifie)."""
    result_info = await send_email_otp(
        db, current_user.id, current_user.email, f"{current_user.first_name} {current_user.last_name}"
    )
    return EmailOTPSendResponse(
        message="Code de confirmation envoye par email",
        **result_info,
    )


@router.post("/disable", dependencies=[Depends(require_permission("mfa.email.setup"))])
async def email_disable(
    data: EmailDisableRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Desactiver specifiquement le MFA par email. Necessite un code email valide."""
    result = await db.execute(
        select(UserMFA).where(
            UserMFA.user_id == current_user.id,
            UserMFA.method == "email",
        )
    )
    mfa_record = result.scalar_one_or_none()

    if not mfa_record or not mfa_record.is_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA par email n'est pas active",
        )

    # Verify email OTP code before disabling
    is_valid = await verify_email_otp(db, current_user.id, data.code)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Code email invalide ou expire",
        )

    mfa_record.is_enabled = False
    mfa_record.is_primary = False
    await db.flush()

    await event_bus.emit(
        "mfa.email_disabled",
        db=db,
        actor_id=current_user.id,
        resource_type="user",
        resource_id=current_user.id,
    )

    return {"ok": True, "message": "MFA par email desactive avec succes"}
