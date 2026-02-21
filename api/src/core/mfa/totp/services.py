"""TOTP services: secret generation, QR code, verification."""

import base64
import io

import pyotp
import qrcode

from ...config import settings


def generate_totp_secret() -> str:
    """Generate a new random base32 TOTP secret."""
    return pyotp.random_base32()


def get_totp_provisioning_uri(secret: str, email: str) -> str:
    """Build the otpauth:// URI for authenticator apps."""
    issuer = settings.MFA_TOTP_ISSUER_NAME
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=email, issuer_name=issuer)


def generate_qr_code_base64(uri: str) -> str:
    """Render a QR code as a base64-encoded PNG."""
    qr = qrcode.make(uri)
    buffer = io.BytesIO()
    qr.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode()


def verify_totp(secret: str, code: str) -> bool:
    """Verify a TOTP code with a +/- 1 time-step window."""
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)


async def verify_totp_code(db, user_id: int, code: str) -> bool:
    """Verify a TOTP code for a specific user by loading their secret from DB."""
    from ..models import UserMFA
    from sqlalchemy import select

    result = await db.execute(
        select(UserMFA).where(
            UserMFA.user_id == user_id,
            UserMFA.method == "totp",
            UserMFA.is_enabled == True,
        )
    )
    mfa = result.scalar_one_or_none()
    if not mfa or not mfa.totp_secret_encrypted:
        return False
    from ...encryption import decrypt_value, is_encrypted
    secret = decrypt_value(mfa.totp_secret_encrypted) if is_encrypted(mfa.totp_secret_encrypted) else mfa.totp_secret_encrypted
    return verify_totp(secret, code)
