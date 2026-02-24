"""TOTP-specific routes: setup, verify-setup, disable."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...database import get_db
from ...events import event_bus
from ...security import get_current_user
from ..models import UserMFA
from ..schemas import BackupCodesResponse, TOTPSetupResponse, TOTPVerifySetupRequest
from ..services import generate_backup_codes
from .services import generate_qr_code_base64, generate_totp_secret, get_totp_provisioning_uri, verify_totp

router = APIRouter()


@router.post("/setup", response_model=TOTPSetupResponse)
async def totp_setup(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Generer un secret TOTP et un QR code pour la configuration initiale."""
    # Check if TOTP already enabled
    result = await db.execute(
        select(UserMFA).where(
            UserMFA.user_id == current_user.id,
            UserMFA.method == "totp",
            UserMFA.is_enabled == True,
        )
    )
    existing_enabled = result.scalar_one_or_none()
    if existing_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="TOTP est deja active pour votre compte",
        )

    # Generate new secret
    secret = generate_totp_secret()
    uri = get_totp_provisioning_uri(secret, current_user.email)
    qr = generate_qr_code_base64(uri)

    # Create or update UserMFA record (not yet enabled)
    result = await db.execute(
        select(UserMFA).where(
            UserMFA.user_id == current_user.id,
            UserMFA.method == "totp",
        )
    )
    mfa_record = result.scalar_one_or_none()

    from ...encryption import encrypt_value
    encrypted_secret = encrypt_value(secret)

    if mfa_record:
        mfa_record.totp_secret_encrypted = encrypted_secret
        mfa_record.totp_verified = False
        mfa_record.is_enabled = False
    else:
        mfa_record = UserMFA(
            user_id=current_user.id,
            method="totp",
            totp_secret_encrypted=encrypted_secret,
            totp_verified=False,
            is_enabled=False,
        )
        db.add(mfa_record)

    await db.flush()

    return TOTPSetupResponse(
        secret=secret,
        qr_code_uri=uri,
        qr_code_base64=qr,
    )


@router.post("/verify-setup", response_model=BackupCodesResponse)
async def totp_verify_setup(
    request: TOTPVerifySetupRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Verifier le premier code TOTP pour confirmer la configuration et activer le MFA."""
    # Load UserMFA for totp
    result = await db.execute(
        select(UserMFA).where(
            UserMFA.user_id == current_user.id,
            UserMFA.method == "totp",
        )
    )
    mfa_record = result.scalar_one_or_none()

    if not mfa_record or not mfa_record.totp_secret_encrypted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Veuillez d'abord configurer le TOTP via /setup",
        )

    if mfa_record.is_enabled and mfa_record.totp_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="TOTP est deja active et verifie",
        )

    # Verify code against stored secret
    from ...encryption import decrypt_value, is_encrypted
    stored_secret = decrypt_value(mfa_record.totp_secret_encrypted) if is_encrypted(mfa_record.totp_secret_encrypted) else mfa_record.totp_secret_encrypted
    if not verify_totp(stored_secret, request.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Code TOTP invalide. Verifiez votre application authenticator.",
        )

    # Activate TOTP
    mfa_record.is_enabled = True
    mfa_record.totp_verified = True
    mfa_record.is_primary = True

    # Unset is_primary on other methods for this user
    other_primary = await db.execute(
        select(UserMFA).where(
            UserMFA.user_id == current_user.id,
            UserMFA.method != "totp",
            UserMFA.is_primary == True,
        )
    )
    for other in other_primary.scalars().all():
        other.is_primary = False

    # Generate backup codes
    codes = await generate_backup_codes(db, current_user.id)

    await db.flush()

    await event_bus.emit(
        "mfa.totp_enabled",
        db=db,
        actor_id=current_user.id,
        resource_type="user",
        resource_id=current_user.id,
    )

    return BackupCodesResponse(
        codes=codes,
        generated_at=datetime.now(timezone.utc),
    )


@router.post("/disable")
async def totp_disable(
    request: TOTPVerifySetupRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Desactiver specifiquement le TOTP. Necessite un code TOTP valide."""
    result = await db.execute(
        select(UserMFA).where(
            UserMFA.user_id == current_user.id,
            UserMFA.method == "totp",
        )
    )
    mfa_record = result.scalar_one_or_none()

    if not mfa_record or not mfa_record.is_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="TOTP n'est pas active",
        )

    # Verify TOTP code before disabling
    from ...encryption import decrypt_value, is_encrypted
    stored_secret = decrypt_value(mfa_record.totp_secret_encrypted) if is_encrypted(mfa_record.totp_secret_encrypted) else mfa_record.totp_secret_encrypted
    if not verify_totp(stored_secret, request.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Code TOTP invalide",
        )

    mfa_record.is_enabled = False
    mfa_record.is_primary = False
    mfa_record.totp_verified = False
    mfa_record.totp_secret_encrypted = None
    await db.flush()

    await event_bus.emit(
        "mfa.totp_disabled",
        db=db,
        actor_id=current_user.id,
        resource_type="user",
        resource_id=current_user.id,
    )

    return {"ok": True, "message": "TOTP desactive avec succes"}
