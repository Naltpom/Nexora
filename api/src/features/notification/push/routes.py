"""Push notification routes: VAPID key, subscribe, unsubscribe, status."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ....core.config import settings
from ....core.security import get_current_user
from ....core.database import get_db
from .models import PushSubscription
from .schemas import (
    PushSubscribeRequest,
    PushSubscriptionResponse,
    PushStatusResponse,
    VapidKeyResponse,
)

router = APIRouter()


@router.get("/vapid-key", response_model=VapidKeyResponse)
async def get_vapid_public_key(
    current_user=Depends(get_current_user),
):
    """Get the VAPID public key for push subscription."""
    if not settings.PUSH_ENABLED or not settings.VAPID_PUBLIC_KEY:
        raise HTTPException(status_code=503, detail="Push notifications non configurees")
    return VapidKeyResponse(vapid_public_key=settings.VAPID_PUBLIC_KEY)


@router.post("/subscribe", response_model=PushSubscriptionResponse, status_code=status.HTTP_201_CREATED)
async def push_subscribe(
    data: PushSubscribeRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Subscribe to push notifications."""
    # Check if subscription already exists
    result = await db.execute(
        select(PushSubscription).where(
            PushSubscription.user_id == current_user.id,
            PushSubscription.endpoint == data.endpoint,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        # Update existing subscription
        existing.p256dh = data.p256dh
        existing.auth = data.auth
        existing.browser = data.browser
        existing.is_active = True
        await db.flush()
        sub = existing
    else:
        # Create new subscription
        sub = PushSubscription(
            user_id=current_user.id,
            endpoint=data.endpoint,
            p256dh=data.p256dh,
            auth=data.auth,
            browser=data.browser,
        )
        db.add(sub)
        await db.flush()

    return PushSubscriptionResponse(
        id=sub.id,
        endpoint=sub.endpoint,
        browser=sub.browser,
        is_active=sub.is_active,
        created_at=sub.created_at,
    )


@router.post("/unsubscribe", status_code=status.HTTP_204_NO_CONTENT)
async def push_unsubscribe(
    endpoint: str = Query(...),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Unsubscribe from push notifications."""
    result = await db.execute(
        select(PushSubscription).where(
            PushSubscription.user_id == current_user.id,
            PushSubscription.endpoint == endpoint,
        )
    )
    sub = result.scalar_one_or_none()
    if sub:
        await db.delete(sub)
        await db.flush()


@router.get("/status", response_model=PushStatusResponse)
async def push_status(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get push subscription status for current user."""
    result = await db.execute(
        select(PushSubscription).where(
            PushSubscription.user_id == current_user.id,
            PushSubscription.is_active.is_(True),
        )
    )
    subs = result.scalars().all()
    return PushStatusResponse(
        has_active_subscriptions=len(subs) > 0,
        subscription_count=len(subs),
        subscriptions=[
            PushSubscriptionResponse(
                id=s.id,
                endpoint=s.endpoint,
                browser=s.browser,
                is_active=s.is_active,
                created_at=s.created_at,
            )
            for s in subs
        ],
    )
