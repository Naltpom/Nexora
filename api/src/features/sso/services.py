"""SSO shared services: user lookup/creation and token issuance."""

import json
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.security import create_access_token, create_refresh_token, create_mfa_token
from .._core.models import User
from .models import SSOAccount

logger = logging.getLogger(__name__)


async def find_or_create_user_from_sso(
    db: AsyncSession,
    provider: str,
    provider_user_id: str,
    email: str,
    first_name: str,
    last_name: str,
    avatar_url: str | None = None,
) -> tuple:
    """Find or create a user from SSO provider data.

    1. Check SSOAccount for (provider, provider_user_id) -> return existing user
    2. Check User with same email -> auto-link SSOAccount + return user
    3. Create new User (auth_source=provider, password_hash=None) + SSOAccount

    Returns (user, is_new_user).
    """
    # 1. Check existing SSO account
    result = await db.execute(
        select(SSOAccount).where(
            SSOAccount.provider == provider,
            SSOAccount.provider_user_id == provider_user_id,
        )
    )
    sso_account = result.scalar_one_or_none()

    if sso_account:
        # Update last login
        sso_account.last_login_at = datetime.now(timezone.utc)
        sso_account.provider_email = email
        sso_account.provider_name = f"{first_name} {last_name}".strip()
        if avatar_url:
            sso_account.provider_avatar_url = avatar_url
        await db.flush()

        # Fetch user
        result = await db.execute(select(User).where(User.id == sso_account.user_id))
        user = result.scalar_one_or_none()
        if user:
            user.last_login = datetime.now(timezone.utc)
            await db.flush()
            return user, False

    # 2. Check existing user by email
    is_new_user = False
    if email:
        result = await db.execute(select(User).where(User.email == email.lower()))
        user = result.scalar_one_or_none()
    else:
        user = None

    # 3. Create new user if needed
    if not user:
        user = User(
            email=email.lower() if email else f"{provider}_{provider_user_id}@sso.local",
            first_name=first_name or "",
            last_name=last_name or "",
            auth_source=provider,
            password_hash=None,
            is_active=True,
            is_super_admin=False,
            must_change_password=False,
        )
        db.add(user)
        await db.flush()
        is_new_user = True

    # Create SSO account link
    sso_account = SSOAccount(
        user_id=user.id,
        provider=provider,
        provider_user_id=provider_user_id,
        provider_email=email,
        provider_name=f"{first_name} {last_name}".strip(),
        provider_avatar_url=avatar_url,
        last_login_at=datetime.now(timezone.utc),
    )
    db.add(sso_account)

    user.last_login = datetime.now(timezone.utc)
    await db.flush()

    return user, is_new_user


async def issue_tokens_for_sso_user(db: AsyncSession, user) -> dict:
    """Issue JWT tokens for an SSO-authenticated user.

    Checks MFA requirement via dynamic import to avoid hard dependency
    on the MFA feature.

    Returns a dict suitable for SSOCallbackResponse.
    """
    token_data = {"sub": str(user.id), "email": user.email}

    # Check MFA requirement (dynamic import, only if feature active)
    mfa_required = False
    mfa_methods = None
    mfa_setup_required = False
    mfa_grace_period_expires = None
    try:
        from ...core.feature_registry import get_registry
        registry = get_registry()
        if registry and registry.is_active("mfa"):
            from ..mfa.services import is_mfa_required_for_user
            mfa_result = await is_mfa_required_for_user(db, user)
            mfa_required = mfa_result.get("mfa_required", False)
            mfa_methods = mfa_result.get("available_methods")
            mfa_setup_required = mfa_result.get("mfa_setup_required", False)
            if mfa_setup_required:
                grace_days = mfa_result.get("grace_period_days", 7)
                # Grace period starts from whichever is more recent: policy update or user creation
                policy_updated = mfa_result.get("policy_updated_at")
                if policy_updated:
                    policy_dt = datetime.fromisoformat(policy_updated)
                    start = max(policy_dt, user.created_at) if user.created_at else policy_dt
                else:
                    start = user.created_at
                if start:
                    expires = start + timedelta(days=grace_days)
                    mfa_grace_period_expires = expires.isoformat()
    except (ImportError, Exception):
        mfa_required = False

    if mfa_required:
        mfa_token = create_mfa_token(user.id, user.email)
        return {
            "access_token": "",
            "refresh_token": "",
            "mfa_required": True,
            "mfa_token": mfa_token,
            "mfa_methods": mfa_methods,
            "must_change_password": False,
            "mfa_setup_required": False,
            "mfa_grace_period_expires": None,
            "preferences": None,
        }

    # Parse user preferences
    preferences = None
    if user.preferences:
        try:
            preferences = json.loads(user.preferences)
        except (json.JSONDecodeError, TypeError):
            preferences = None

    return {
        "access_token": create_access_token(token_data),
        "refresh_token": create_refresh_token(token_data),
        "mfa_required": False,
        "mfa_token": None,
        "mfa_methods": None,
        "must_change_password": user.must_change_password,
        "mfa_setup_required": mfa_setup_required,
        "mfa_grace_period_expires": mfa_grace_period_expires,
        "preferences": preferences,
    }
