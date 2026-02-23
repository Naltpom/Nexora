"""Google SSO routes: authorize, callback, link."""

import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from jose import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...config import settings
from ...database import get_db
from ...events import event_bus
from ...security import get_current_user
from ..models import SSOAccount
from ..schemas import SSOAccountResponse, SSOAuthorizeResponse, SSOCallbackRequest, SSOCallbackResponse
from ..services import find_or_create_user_from_sso, issue_tokens_for_sso_user
from .services import exchange_google_code, get_google_authorize_url

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/authorize", response_model=SSOAuthorizeResponse)
async def google_authorize(link: bool = Query(False)):
    """Genere l'URL d'autorisation Google OAuth2."""
    state = jwt.encode(
        {
            "provider": "google",
            "action": "link" if link else "login",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=10),
        },
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )
    url = await get_google_authorize_url(state)
    return SSOAuthorizeResponse(authorization_url=url)


@router.post("/callback", response_model=SSOCallbackResponse)
async def google_callback(
    body: SSOCallbackRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Echange le code d'autorisation Google OAuth2 contre des tokens."""
    # Validate state if provided
    if body.state:
        try:
            payload = jwt.decode(
                body.state,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM],
            )
            if payload.get("provider") != "google":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="State SSO invalide",
                )
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="State SSO invalide ou expire",
            )

    # Exchange code for user info
    try:
        user_info = await exchange_google_code(body.code)
    except Exception:
        ip = request.client.host if request.client else "unknown"
        logger.warning("sso.login_failed provider=google ip=%s", ip)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Impossible d'echanger le code Google. Veuillez reessayer.",
        )

    # Find or create user
    user, is_new = await find_or_create_user_from_sso(
        db,
        provider="google",
        provider_user_id=user_info["provider_user_id"],
        email=user_info["email"],
        first_name=user_info["first_name"],
        last_name=user_info["last_name"],
        avatar_url=user_info.get("avatar_url"),
    )

    # Issue tokens
    result = await issue_tokens_for_sso_user(db, user)

    await event_bus.emit(
        "sso.login",
        db=db,
        actor_id=user.id,
        resource_type="user",
        resource_id=user.id,
        payload={
            "provider": "google",
            "email": user_info["email"],
            "provider_user_id": user_info["provider_user_id"],
        },
    )

    if is_new:
        await event_bus.emit(
            "sso.user_created",
            db=db,
            actor_id=user.id,
            resource_type="user",
            resource_id=user.id,
            payload={"provider": "google", "email": user_info["email"]},
        )

    return SSOCallbackResponse(is_new_user=is_new, **result)


@router.post("/link", response_model=SSOAccountResponse)
async def google_link(
    body: SSOCallbackRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Lie un compte Google a l'utilisateur connecte."""
    ip = request.client.host if request.client else "unknown"

    # Exchange code for user info
    try:
        user_info = await exchange_google_code(body.code)
    except Exception:
        await event_bus.emit(
            "sso.link_failed",
            db=db,
            actor_id=current_user.id,
            resource_type="user",
            resource_id=current_user.id,
            payload={"provider": "google", "reason": "code_exchange_failed", "ip": ip},
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Impossible d'echanger le code Google. Veuillez reessayer.",
        )

    # Check if this Google account is already linked to another user
    result = await db.execute(
        select(SSOAccount).where(
            SSOAccount.provider == "google",
            SSOAccount.provider_user_id == user_info["provider_user_id"],
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        if existing.user_id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ce compte Google est deja lie a votre compte",
            )
        await event_bus.emit(
            "sso.link_rejected",
            db=db,
            actor_id=current_user.id,
            resource_type="user",
            resource_id=current_user.id,
            payload={
                "provider": "google",
                "provider_user_id": user_info["provider_user_id"],
                "reason": "already_linked_other_user",
            },
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ce compte Google est deja lie a un autre utilisateur",
        )

    # Create SSO account link
    sso_account = SSOAccount(
        user_id=current_user.id,
        provider="google",
        provider_user_id=user_info["provider_user_id"],
        provider_email=user_info["email"],
        provider_name=f"{user_info['first_name']} {user_info['last_name']}".strip(),
        provider_avatar_url=user_info.get("avatar_url"),
    )
    db.add(sso_account)
    await db.flush()

    await event_bus.emit(
        "sso.account_linked",
        db=db,
        actor_id=current_user.id,
        resource_type="sso_account",
        resource_id=sso_account.id,
        payload={
            "provider": "google",
            "provider_email": user_info["email"],
            "provider_user_id": user_info["provider_user_id"],
        },
    )

    return SSOAccountResponse(
        id=sso_account.id,
        provider=sso_account.provider,
        provider_email=sso_account.provider_email,
        provider_name=sso_account.provider_name,
        provider_avatar_url=sso_account.provider_avatar_url,
        created_at=sso_account.created_at,
        last_login_at=sso_account.last_login_at,
    )
