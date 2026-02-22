"""Helper to enqueue background tasks via ARQ."""

import logging
from typing import Any

from arq import ArqRedis, create_pool
from arq.connections import RedisSettings

from .config import settings

logger = logging.getLogger(__name__)

_pool: ArqRedis | None = None


def _redis_settings() -> RedisSettings:
    from urllib.parse import urlparse

    parsed = urlparse(settings.REDIS_URL)
    return RedisSettings(
        host=parsed.hostname or "redis",
        port=parsed.port or 6379,
        database=int(parsed.path.lstrip("/") or 0),
        password=parsed.password,
    )


async def get_arq_pool() -> ArqRedis:
    global _pool
    if _pool is None:
        _pool = await create_pool(_redis_settings())
    return _pool


async def enqueue(func_name: str, *args: Any, **kwargs: Any) -> None:
    """Enqueue a background task. Silently logs errors (fire-and-forget)."""
    try:
        pool = await get_arq_pool()
        await pool.enqueue_job(func_name, *args, **kwargs)
    except Exception:
        logger.exception("Failed to enqueue task %s", func_name)
