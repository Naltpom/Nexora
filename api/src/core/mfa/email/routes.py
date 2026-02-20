"""Email OTP routes: enable, send-code, disable."""

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...database import get_db
from ...security import get_current_user, decode_mfa_token
from ..._identity.models import User
from ..models import UserMFA
from ..schemas import EmailOTPSendResponse, BackupCodesResponse
from ..services import generate_backup_codes
from .services import send_email_otp

from datetime import datetime, timezone

router = APIRouter()


@router.post("/enable", response_model=BackupCodesResponse)
async def email_enable(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Activer le MFA par email pour l'utilisateur courant."""
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

    # Create or update UserMFA record
    result = await db.execute(
        select(UserMFA).where(
            UserMFA.user_id == current_user.id,
            UserMFA.method == "email",
        )
    )
    mfa_record = result.scalar_one_or_none()

    if mfa_record:
        mfa_record.is_enabled = True
        mfa_record.email_address = current_user.email
    else:
        mfa_record = UserMFA(
            user_id=current_user.id,
            method="email",
            is_enabled=True,
            email_address=current_user.email,
        )
        db.add(mfa_record)

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

    return BackupCodesResponse(
        codes=codes,
        generated_at=datetime.now(timezone.utc),
    )


@router.post("/send-code", response_model=EmailOTPSendResponse)
async def send_code(
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
        user_id, user.email, f"{user.first_name} {user.last_name}"
    )
    return EmailOTPSendResponse(
        message="Code envoye par email",
        **result_info,
    )


@router.post("/disable")
async def email_disable(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Desactiver specifiquement le MFA par email."""
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

    mfa_record.is_enabled = False
    mfa_record.is_primary = False
    await db.flush()

    return {"ok": True, "message": "MFA par email desactive avec succes"}
