"""Mass fixture generator for events."""

from datetime import datetime, timedelta, timezone
from typing import Any

from faker import Faker
from sqlalchemy.ext.asyncio import AsyncSession

from ..fixture_registry import FixtureContext, FixtureDefinition
from .models import Event

fake = Faker("fr_FR")

# Realistic event types from _identity manifest, with resource_type
EVENT_TYPES = [
    ("user.login", "user"),
    ("user.registered", "user"),
    ("user.updated", "user"),
    ("user.password_changed", "user"),
    ("user.password_reset", "user"),
    ("user.email_verified", "user"),
    ("user.deactivated", "user"),
    ("user.roles_updated", "user"),
    ("user.invited", "user"),
    ("user.invitation_accepted", "user"),
    ("role.created", "role"),
    ("role.updated", "role"),
    ("admin.settings_updated", "setting"),
    ("admin.feature_toggled", "feature"),
    ("admin.impersonation_started", "user"),
    ("admin.impersonation_stopped", "user"),
    ("preference.updated", "user"),
    ("command.executed", "command"),
]


async def _generate_events(db: AsyncSession, ctx: FixtureContext) -> dict[str, Any]:
    """Generate mass events spread over the last 90 days."""
    scale = ctx.scale
    user_ids = ctx.user_ids

    if not user_ids:
        return {"error": "No user IDs available. _identity fixtures must run first."}

    now = datetime.now(timezone.utc)
    total = scale * 5  # ~5 events per scale unit

    generated: list[Event] = []

    for _ in range(total):
        actor_id = fake.random_element(user_ids)
        resource_id = fake.random_element(user_ids)
        event_type, resource_type = fake.random_element(EVENT_TYPES)

        days_ago = fake.random_int(min=0, max=90)
        hours_ago = fake.random_int(min=0, max=23)

        event = Event(
            event_type=event_type,
            actor_id=actor_id,
            resource_type=resource_type,
            resource_id=resource_id,
            payload={"actor_name": fake.name(), "ip": fake.ipv4()},
            created_at=now - timedelta(days=days_ago, hours=hours_ago),
        )
        db.add(event)
        generated.append(event)

    await db.flush()

    # Store event IDs for notification fixtures
    ctx.set("event.event_ids", [e.id for e in generated])

    return {
        "events_created": len(generated),
        "event_types_used": len(EVENT_TYPES),
        "date_range_days": 90,
    }


fixtures = [
    FixtureDefinition(
        name="event",
        label="Events",
        description="Generate mass application events (login, profile changes, admin actions)",
        depends=["_identity"],
        handler=_generate_events,
        check_table="events",
        check_min_rows=50,
    ),
]
