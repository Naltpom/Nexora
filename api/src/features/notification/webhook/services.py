"""HTTP webhook sender service."""

import hashlib
import hmac
import json
import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)


class HttpWebhookSender:
    """HTTP implementation of the webhook sender."""

    async def send(
        self,
        url: str,
        payload: dict[str, Any],
        *,
        secret: str | None = None,
    ) -> None:
        body = json.dumps(payload, default=str)
        headers = {"Content-Type": "application/json"}

        # HMAC signature if a secret is configured
        if secret:
            signature = hmac.new(
                secret.encode("utf-8"),
                body.encode("utf-8"),
                hashlib.sha256,
            ).hexdigest()
            headers["X-Webhook-Signature"] = f"sha256={signature}"

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, content=body, headers=headers)
                logger.info(
                    "Webhook sent: url=%s status=%d",
                    url,
                    response.status_code,
                )
        except Exception:
            logger.exception("Webhook failed: url=%s", url)
