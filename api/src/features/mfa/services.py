"""Core MFA logic: status checks, code verification, backup codes."""

import secrets
from datetime import datetime, timezone

from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.security import hash_password, verify_password


async def is_mfa_required_for_user(db: AsyncSession, user) -> dict:
    """
    Check if user has MFA enabled -> return mfa_required=True + methods.
    If not, check role policies -> return mfa_setup_required if policy requires MFA but not configured.

    Only returns methods whose sub-feature is active (mfa.totp, mfa.email).
    """
    from .models import UserMFA, MFARolePolicy
    from .._core.models import UserRole
    from ...core.feature_registry import get_registry

    # Determine which MFA methods are available based on active sub-features
    registry = get_registry()
    active_methods: set[str] = set()
    if registry:
        if registry.is_active("mfa.totp"):
            active_methods.add("totp")
        if registry.is_active("mfa.email"):
            active_methods.add("email")
    else:
        # Fallback: allow all if registry not available
        active_methods = {"totp", "email"}

    # Check enabled methods
    result = await db.execute(
        select(UserMFA).where(UserMFA.user_id == user.id, UserMFA.is_enabled == True)
    )
    enabled = result.scalars().all()
    if enabled:
        # Filter by active sub-features
        available = [m.method for m in enabled if m.method in active_methods]
        # Backup codes are always available if user has any enabled method
        if available and any(m.method == "backup" for m in enabled):
            available.append("backup")
        if available:
            return {"mfa_required": True, "available_methods": available}
        # User has MFA configured but no active sub-feature → skip MFA
        return {"mfa_required": False, "available_methods": []}

    # Check role policies
    result = await db.execute(
        select(MFARolePolicy)
        .join(UserRole, UserRole.role_id == MFARolePolicy.role_id)
        .where(UserRole.user_id == user.id, MFARolePolicy.mfa_required == True)
    )
    policy = result.scalars().first()
    if policy:
        return {
            "mfa_required": False,
            "mfa_setup_required": True,
            "grace_period_days": policy.grace_period_days,
            "policy_updated_at": policy.updated_at.isoformat() if policy.updated_at else None,
        }

    return {"mfa_required": False, "available_methods": []}


async def verify_mfa_code(db: AsyncSession, user_id: int, code: str, method: str) -> bool:
    """Dispatch to appropriate method verifier."""
    if method == "totp":
        from .totp.services import verify_totp_code
        return await verify_totp_code(db, user_id, code)
    elif method == "email":
        from .email.services import verify_email_otp
        return await verify_email_otp(db, user_id, code)
    elif method == "backup":
        return await verify_backup_code(db, user_id, code)
    return False


async def verify_backup_code(db: AsyncSession, user_id: int, code: str) -> bool:
    """Check backup code against hashed codes, mark used if match."""
    from .models import MFABackupCode

    result = await db.execute(
        select(MFABackupCode).where(
            MFABackupCode.user_id == user_id,
            MFABackupCode.is_used == False,
        )
    )
    for backup in result.scalars().all():
        if verify_password(code, backup.code_hash):
            backup.is_used = True
            backup.used_at = datetime.now(timezone.utc)
            await db.flush()
            return True
    return False


async def generate_backup_codes(db: AsyncSession, user_id: int, count: int = 10) -> list[str]:
    """Generate new backup codes, deleting all existing ones."""
    from .models import MFABackupCode

    await db.execute(delete(MFABackupCode).where(MFABackupCode.user_id == user_id))
    codes = []
    for _ in range(count):
        code = f"{secrets.token_hex(3)}-{secrets.token_hex(3)}"
        codes.append(code)
        db.add(MFABackupCode(user_id=user_id, code_hash=hash_password(code)))
    await db.flush()
    return codes


async def get_backup_codes_count(db: AsyncSession, user_id: int) -> int:
    """Get count of remaining (unused) backup codes."""
    from .models import MFABackupCode

    result = await db.execute(
        select(func.count(MFABackupCode.id)).where(
            MFABackupCode.user_id == user_id,
            MFABackupCode.is_used == False,
        )
    )
    return result.scalar() or 0
