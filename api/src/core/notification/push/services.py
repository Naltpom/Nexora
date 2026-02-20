"""Web Push sender service using VAPID."""

import base64
import json
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...config import settings
from .models import PushSubscription

logger = logging.getLogger(__name__)


class WebPushSender:
    """Web Push (VAPID) sender implementation."""

    async def send(
        self,
        user_id: int,
        title: str,
        body: str | None,
        link: str | None,
        db: AsyncSession | None = None,
    ) -> None:
        if not settings.PUSH_ENABLED:
            return

        if db is None:
            logger.warning("WebPushSender.send called without db session, skipping")
            return

        result = await db.execute(
            select(PushSubscription).where(
                PushSubscription.user_id == user_id,
                PushSubscription.is_active.is_(True),
            )
        )
        subscriptions = result.scalars().all()
        if not subscriptions:
            return

        payload = json.dumps({
            "title": title,
            "body": body or "",
            "icon": "/logo_full.svg",
            "url": link,
            "tag": f"notif-{user_id}",
        })

        # Convert PEM private key to raw base64url format expected by pywebpush
        from cryptography.hazmat.primitives.serialization import load_pem_private_key

        pem_str = settings.VAPID_PRIVATE_KEY.replace("\\n", "\n")
        ec_key = load_pem_private_key(pem_str.encode(), password=None)
        raw_bytes = ec_key.private_numbers().private_value.to_bytes(32, "big")
        vapid_key = base64.urlsafe_b64encode(raw_bytes).rstrip(b"=").decode()

        expired_ids: list[int] = []

        for sub in subscriptions:
            subscription_info = {
                "endpoint": sub.endpoint,
                "keys": {
                    "p256dh": sub.p256dh,
                    "auth": sub.auth,
                },
            }
            try:
                from pywebpush import webpush

                webpush(
                    subscription_info=subscription_info,
                    data=payload,
                    vapid_private_key=vapid_key,
                    vapid_claims={"sub": settings.VAPID_SUBJECT},
                )
            except Exception as e:
                if (
                    hasattr(e, "response")
                    and e.response is not None
                    and e.response.status_code in (404, 410)
                ):
                    if sub.id is not None:
                        expired_ids.append(sub.id)
                    logger.info(
                        "Push subscription expired: user_id=%d endpoint=%s",
                        user_id,
                        sub.endpoint[:50],
                    )
                else:
                    logger.warning("Push failed for user_id=%d: %s", user_id, str(e))

        # Deactivate expired subscriptions
        for sub_id in expired_ids:
            result = await db.execute(
                select(PushSubscription).where(PushSubscription.id == sub_id)
            )
            sub = result.scalar_one_or_none()
            if sub:
                sub.is_active = False
        if expired_ids:
            await db.flush()
