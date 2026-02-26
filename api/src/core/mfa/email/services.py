"""Email OTP services: generation, sending, verification (DB-backed)."""

import math
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from ...config import settings
from ...security import hash_password, verify_password
from ..models import MFAEmailCode


def generate_email_otp() -> str:
    """Generate a numeric OTP of configured length."""
    length = settings.MFA_EMAIL_CODE_LENGTH
    return "".join([str(secrets.randbelow(10)) for _ in range(length)])


async def send_email_otp(db: AsyncSession, user_id: int, email: str, name: str) -> dict:
    """Generate, persist, and send an email OTP to the user."""
    cooldown = settings.MFA_EMAIL_RESEND_COOLDOWN_SECONDS
    expiry = settings.MFA_EMAIL_CODE_EXPIRY_MINUTES

    # Check cooldown: refuse if a code was sent recently
    result = await db.execute(
        select(MFAEmailCode).where(
            MFAEmailCode.user_id == user_id,
            MFAEmailCode.is_used == False,
        ).order_by(MFAEmailCode.created_at.desc())
    )
    existing = result.scalar_one_or_none()

    if existing:
        elapsed = (datetime.now(timezone.utc) - existing.created_at).total_seconds()
        remaining = cooldown - elapsed
        if remaining > 0:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "message": "Veuillez patienter avant de renvoyer un code",
                    "retry_after_seconds": math.ceil(remaining),
                },
            )

    code = generate_email_otp()

    # Delete previous unused codes for this user
    await db.execute(
        delete(MFAEmailCode).where(
            MFAEmailCode.user_id == user_id,
            MFAEmailCode.is_used == False,
        )
    )

    # Store hashed code in DB
    db.add(MFAEmailCode(
        user_id=user_id,
        code_hash=hash_password(code),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=expiry),
    ))
    await db.flush()

    # Send via existing email infrastructure
    from ...notification.email.services import SmtpEmailSender

    sender = SmtpEmailSender()
    sent = sender.send_verification_code(to_email=email, to_name=name, verification_code=code)
    if not sent:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Echec de l'envoi de l'email. Verifiez la configuration SMTP.",
        )

    return {"expires_in_seconds": expiry * 60, "resend_cooldown_seconds": cooldown}


async def verify_email_otp(db: AsyncSession, user_id: int, code: str) -> bool:
    """Verify an email OTP code against the DB store."""
    result = await db.execute(
        select(MFAEmailCode).where(
            MFAEmailCode.user_id == user_id,
            MFAEmailCode.is_used == False,
        )
    )
    stored = result.scalar_one_or_none()
    if not stored:
        return False

    if stored.expires_at < datetime.now(timezone.utc):
        await db.delete(stored)
        await db.flush()
        return False

    if verify_password(code, stored.code_hash):
        stored.is_used = True
        await db.flush()
        return True

    return False
