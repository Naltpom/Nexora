"""ARQ background worker for async notification delivery + scheduled commands."""

import asyncio
import logging

from arq import cron
from arq.connections import RedisSettings

from src.core.config import settings
from src.core.cron_parser import cron_to_arq_kwargs
from src.core.search.tasks import search_full_reindex

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


# ── Scheduled command execution ─────────────────────────────────────────

async def run_scheduled_command(ctx, command_name: str) -> dict:
    """Execute a scheduled command within its own DB session."""
    from sqlalchemy import select

    from src.core._identity.models import CommandState
    from src.core.command_registry import get_command_registry
    from src.core.database import async_session

    registry = get_command_registry()
    if not registry:
        logger.error("Command registry not available for scheduled command '%s'", command_name)
        return {"error": "registry not available"}

    async with async_session() as db:
        # Reload enabled state from DB to reflect admin toggles without worker restart
        state = (await db.execute(
            select(CommandState).where(CommandState.name == command_name)
        )).scalar_one_or_none()
        if state is not None:
            registry.set_command_enabled(command_name, state.enabled)
            if not state.enabled:
                logger.info("Scheduled command '%s' skipped (disabled in DB)", command_name)
                return {"skipped": True, "reason": "disabled"}

        try:
            result = await registry.run_command(command_name, db, source="scheduler")
            await db.commit()
            logger.info("Scheduled command '%s' completed: %s", command_name, result)
            return result
        except Exception as e:
            await db.rollback()
            logger.error("Scheduled command '%s' failed: %s", command_name, e)
            raise


def _make_cron_runner(cmd_name: str):
    """Create a closure that ARQ cron() can call with just (ctx)."""
    async def _runner(ctx):
        return await run_scheduled_command(ctx, cmd_name)
    _runner.__qualname__ = f"cron_{cmd_name}"
    return _runner


def _build_cron_jobs() -> list:
    """Discover commands with schedules and build ARQ cron job list."""
    from src.core.command_registry import CommandRegistry

    registry = CommandRegistry()
    registry.discover()
    registry.load_states_from_db_sync()

    jobs = []
    for cmd in registry.get_all_commands():
        if not cmd.schedule:
            continue
        try:
            arq_kwargs = cron_to_arq_kwargs(cmd.schedule)
        except ValueError as e:
            logger.error("Invalid cron expression for '%s': %s", cmd.name, e)
            continue

        jobs.append(
            cron(
                _make_cron_runner(cmd.name),
                name=f"cron:{cmd.name}",
                timeout=cmd.timeout,
                **arq_kwargs,
            )
        )
        state_label = "enabled" if cmd.enabled else "disabled (checked at runtime)"
        logger.info("Registered cron job: %s [%s] (%s)", cmd.name, cmd.schedule, state_label)

    return jobs


def _load_feature_states_sync() -> dict[str, bool]:
    """Load feature states from DB (sync, for worker startup)."""
    from sqlalchemy import create_engine, inspect, select
    from sqlalchemy.orm import Session

    from src.core._identity.models import FeatureState

    sync_engine = create_engine(settings.database_url_sync)
    states = {}
    try:
        with Session(sync_engine) as session:
            inspector = inspect(sync_engine)
            if "feature_states" in inspector.get_table_names():
                rows = session.execute(select(FeatureState)).scalars().all()
                for row in rows:
                    states[row.name] = row.is_active
    except Exception as e:
        logger.warning("Could not load feature states in worker: %s", e)
    finally:
        sync_engine.dispose()
    return states


async def _on_worker_startup(ctx):
    """Initialize registries needed by worker tasks (separate process from API)."""
    from src.core.feature_registry import FeatureRegistry, get_registry

    if not get_registry():
        registry = FeatureRegistry()
        registry.discover()
        db_states = _load_feature_states_sync()
        registry.load_states(db_states)
        logger.info("Feature registry initialized in worker (%d features active).", sum(db_states.values()))


class WorkerSettings:
    functions = [send_email_task, send_webhook_task, send_push_task, search_full_reindex]
    redis_settings = _parse_redis_url(settings.REDIS_URL)
    max_jobs = 10
    job_timeout = 60
    cron_jobs = _build_cron_jobs()
    on_startup = _on_worker_startup
