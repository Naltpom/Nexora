import hashlib
import hmac
from datetime import datetime, timedelta, timezone

# Workaround: passlib 1.7.4 expects bcrypt.__about__ removed in bcrypt >= 4.x
import bcrypt as _bcrypt
if not hasattr(_bcrypt, "__about__"):
    _bcrypt.__about__ = type("about", (), {"__version__": _bcrypt.__version__})()

from fastapi import Depends, HTTPException, Query, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .database import get_db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security_scheme = HTTPBearer()

IMPERSONATION_TOKEN_EXPIRE_MINUTES = 120


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


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


def create_impersonation_token(
    target_user_id: int,
    target_email: str,
    admin_user_id: int,
    session_id: str,
) -> str:
    to_encode = {
        "sub": str(target_user_id),
        "email": target_email,
        "impersonated_by": admin_user_id,
        "impersonation_session_id": session_id,
        "type": "access",
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
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide ou expiré",
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
):
    from ._identity.models import User, ImpersonationLog

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

        session.last_activity_at = datetime.now(timezone.utc)
        await db.flush()

    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active or user.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Utilisateur introuvable ou désactivé")

    user._impersonated_by = impersonated_by
    user._impersonation_session_id = payload.get("impersonation_session_id")
    return user


async def _is_super_admin(db: AsyncSession, user) -> bool:
    """Check if user has super_admin privileges via RBAC role or legacy flag."""
    # Legacy flag (kept for transition period)
    if user.is_super_admin:
        return True
    # RBAC: check if user has the 'super_admin' role
    from ._identity.models import Role, UserRole
    result = await db.execute(
        select(Role.name)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(UserRole.user_id == user.id, Role.name == "super_admin")
    )
    return result.scalar_one_or_none() is not None


async def get_current_super_admin(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if is_impersonating(current_user):
        original_admin_id = get_original_admin_id(current_user)
        if original_admin_id:
            from ._identity.models import User

            result = await db.execute(select(User).where(User.id == original_admin_id))
            original_admin = result.scalar_one_or_none()
            if original_admin and await _is_super_admin(db, original_admin):
                return current_user

    if not await _is_super_admin(db, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès réservé aux super administrateurs")
    return current_user


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
