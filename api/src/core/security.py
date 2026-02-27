import hashlib
import hmac
import re
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Query, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.exceptions import PyJWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .database import get_db

security_scheme = HTTPBearer()

IMPERSONATION_TOKEN_EXPIRE_MINUTES = 120


def validate_password(password: str) -> None:
    """Enforce password policy: min 8 chars, 1 uppercase, 1 digit, 1 special."""
    errors = []
    if len(password) < 8:
        errors.append("au moins 8 caracteres")
    if not re.search(r"[A-Z]", password):
        errors.append("au moins une majuscule")
    if not re.search(r"\d", password):
        errors.append("au moins un chiffre")
    if not re.search(r"[^a-zA-Z0-9]", password):
        errors.append("au moins un caractere special")
    if errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le mot de passe doit contenir : " + ", ".join(errors),
        )


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def hash_refresh_token(token: str) -> str:
    """HMAC-SHA256 hash for refresh token session tracking."""
    return hmac.new(
        settings.SECRET_KEY.encode(),
        token.encode(),
        hashlib.sha256,
    ).hexdigest()


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def set_refresh_cookie(response: Response, refresh_token: str) -> None:
    """Set the refresh token as an HttpOnly cookie on the response."""
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.ENV != "dev",
        samesite="lax",
        path="/api/auth",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
    )


def clear_refresh_cookie(response: Response) -> None:
    """Remove the refresh token cookie."""
    response.delete_cookie(key="refresh_token", path="/api/auth")


def create_impersonation_token(
    target_user_id: int,
    target_email: str,
    admin_user_id: int,
    session_id: str,
    lang: str = "fr",
) -> str:
    to_encode = {
        "sub": str(target_user_id),
        "email": target_email,
        "impersonated_by": admin_user_id,
        "impersonation_session_id": session_id,
        "type": "access",
        "lang": lang,
    }
    expire = datetime.now(timezone.utc) + timedelta(minutes=IMPERSONATION_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


MFA_TOKEN_EXPIRE_MINUTES = 5


def create_mfa_token(user_id: int, email: str) -> str:
    """Create a short-lived token for the MFA verification step."""
    to_encode = {
        "sub": str(user_id),
        "email": email,
        "type": "mfa_pending",
    }
    expire = datetime.now(timezone.utc) + timedelta(minutes=MFA_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_mfa_token(token: str) -> dict:
    """Decode and validate an MFA pending token."""
    payload = decode_token(token)
    if payload.get("type") != "mfa_pending":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token MFA invalide",
        )
    return payload


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide ou expiré",
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
):
    from ._identity.models import ImpersonationLog, User

    payload = decode_token(credentials.credentials)
    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Type de token invalide")

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalide")

    impersonated_by = payload.get("impersonated_by")
    if impersonated_by:
        session_id = payload.get("impersonation_session_id")
        if not session_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session d'impersonation invalide")

        result = await db.execute(
            select(ImpersonationLog).where(
                ImpersonationLog.session_id == session_id,
                ImpersonationLog.ended_at.is_(None),
            )
        )
        session = result.scalar_one_or_none()
        if not session:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session d'impersonation expirée")

        # CRITICAL-03: verify the original admin is still active and has impersonation permission
        admin_result = await db.execute(select(User).where(User.id == int(impersonated_by)))
        admin_user = admin_result.scalar_one_or_none()
        if admin_user is None or not admin_user.is_active or admin_user.deleted_at is not None or admin_user.archived_at is not None:
            session.ended_at = datetime.now(timezone.utc)
            await db.flush()
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Administrateur source désactivé")

        session.last_activity_at = datetime.now(timezone.utc)
        await db.flush()

    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active or user.deleted_at is not None or user.archived_at is not None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Utilisateur introuvable ou désactivé")

    user._impersonated_by = impersonated_by
    user._impersonation_session_id = payload.get("impersonation_session_id")
    return user


def is_impersonating(user) -> bool:
    return hasattr(user, "_impersonated_by") and user._impersonated_by is not None


def get_original_admin_id(user) -> int | None:
    return getattr(user, "_impersonated_by", None)


async def prevent_impersonation_action(current_user=Depends(get_current_user)):
    if is_impersonating(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cette action n'est pas autorisée en mode impersonation",
        )
    return current_user


async def get_current_user_from_query_token(
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    from ._identity.models import User

    payload = decode_token(token)
    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalide")

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalide")

    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active or user.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Utilisateur introuvable")
    return user


def decode_query_token_lightweight(token: str = Query(...)) -> dict:
    """Decode a JWT query token without opening a DB session.

    Use this for long-lived connections (SSE) to avoid holding a DB
    connection for the entire stream duration.
    """
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalide")
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalide")
    return {"user_id": int(user_id), "email": payload.get("email")}
