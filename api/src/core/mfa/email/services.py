"""Email OTP services: generation, sending, verification."""

import secrets
from datetime import datetime, timezone, timedelta

from ...config import settings
from ...security import hash_password, verify_password

# In-memory OTP store (user_id -> {code_hash, expires_at})
_email_otp_store: dict[int, dict] = {}


def generate_email_otp() -> str:
    """Generate a numeric OTP of configured length."""
    length = settings.MFA_EMAIL_CODE_LENGTH
    return "".join([str(secrets.randbelow(10)) for _ in range(length)])


async def send_email_otp(user_id: int, email: str, name: str) -> dict:
    """Generate and send an email OTP to the user."""
    code = generate_email_otp()
    expiry = settings.MFA_EMAIL_CODE_EXPIRY_MINUTES

    _email_otp_store[user_id] = {
        "code_hash": hash_password(code),
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=expiry),
    }

    # Send via existing email infrastructure
    from ...notification.email.services import SmtpEmailSender

    sender = SmtpEmailSender()
    sender.send_verification_code(to_email=email, to_name=name, verification_code=code)

    return {"expires_in_seconds": expiry * 60}


async def verify_email_otp(db, user_id: int, code: str) -> bool:
    """Verify an email OTP code against the in-memory store."""
    stored = _email_otp_store.get(user_id)
    if not stored:
        return False

    if stored["expires_at"] < datetime.now(timezone.utc):
        del _email_otp_store[user_id]
        return False

    if verify_password(code, stored["code_hash"]):
        del _email_otp_store[user_id]
        return True

    return False
