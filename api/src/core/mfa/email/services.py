"""Email OTP services: generation, sending, verification (DB-backed)."""

import secrets
from datetime import datetime, timedelta, timezone

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
    code = generate_email_otp()
    expiry = settings.MFA_EMAIL_CODE_EXPIRY_MINUTES

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
    sender.send_verification_code(to_email=email, to_name=name, verification_code=code)

    return {"expires_in_seconds": expiry * 60}


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
