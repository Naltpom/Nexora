"""ARQ background worker for async notification delivery."""

import asyncio
import logging

from arq.connections import RedisSettings

from src.core.config import settings

logger = logging.getLogger(__name__)


def _parse_redis_url(url: str) -> RedisSettings:
    """Parse a redis:// URL into ARQ RedisSettings."""
    from urllib.parse import urlparse

    parsed = urlparse(url)
    return RedisSettings(
        host=parsed.hostname or "redis",
        port=parsed.port or 6379,
        database=int(parsed.path.lstrip("/") or 0),
        password=parsed.password,
    )


async def send_email_task(
    ctx,
    to_email: str,
    to_name: str,
    title: str,
    body: str | None,
    link: str | None,
) -> bool:
    """Send a notification email in the background."""
    from src.core.notification.email.services import SmtpEmailSender

    sender = SmtpEmailSender()
    # Run synchronous SMTP in a thread to not block the worker event loop
    return await asyncio.to_thread(sender.send_notification, to_email, to_name, title, body, link)


async def send_webhook_task(
    ctx,
    url: str,
    payload: dict,
    secret: str | None = None,
    webhook_id: int | None = None,
    event_id: int | None = None,
) -> dict:
    """Send a webhook in the background."""
    from src.core.notification.webhook.services import HttpWebhookSender

    sender = HttpWebhookSender()
    # No db passed — delivery logging is skipped in background (could be enhanced later)
    return await sender.send(url, payload, secret=secret, webhook_id=webhook_id, event_id=event_id)


async def send_push_task(
    ctx,
    user_id: int,
    title: str,
    body: str | None,
    link: str | None,
) -> None:
    """Send push notifications in the background."""
    from src.core.database import async_session
    from src.core.notification.push.services import WebPushSender

    sender = WebPushSender()
    async with async_session() as db:
        await sender.send(user_id, title, body, link, db=db)
        await db.commit()


class WorkerSettings:
    functions = [send_email_task, send_webhook_task, send_push_task]
    redis_settings = _parse_redis_url(settings.REDIS_URL)
    max_jobs = 10
    job_timeout = 60
