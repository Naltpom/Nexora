"""HTTP webhook sender service."""

import hashlib
import hmac
import json
import logging
import time
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
        webhook_id: int | None = None,
        event_id: int | None = None,
        db=None,
    ) -> dict:
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

        start = time.monotonic()
        status_code = None
        success = False
        error_msg = None

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, content=body, headers=headers)
                status_code = response.status_code
                success = 200 <= status_code < 300
                logger.info("Webhook sent: url=%s status=%d", url, status_code)
        except Exception as exc:
            error_msg = str(exc)
            logger.exception("Webhook failed: url=%s", url)

        duration_ms = int((time.monotonic() - start) * 1000)

        # Log delivery if DB session provided
        if db and webhook_id:
            try:
                from .models import WebhookDeliveryLog
                log_entry = WebhookDeliveryLog(
                    webhook_id=webhook_id,
                    event_id=event_id,
                    status_code=status_code,
                    success=success,
                    error_message=error_msg,
                    duration_ms=duration_ms,
                )
                db.add(log_entry)
            except Exception:
                logger.exception("Failed to log webhook delivery")

        return {"success": success, "status_code": status_code, "error": error_msg}
