"""Mass fixture generator for notifications."""

from datetime import datetime, timedelta, timezone
from typing import Any

from faker import Faker
from sqlalchemy.ext.asyncio import AsyncSession

from ..fixture_registry import FixtureContext, FixtureDefinition
from .models import Notification

fake = Faker("fr_FR")

NOTIFICATION_TEMPLATES = [
    "{name} s'est inscrit",
    "{name} a mis a jour son profil",
    "Nouveau mot de passe pour {name}",
    "{name} a ete desactive",
    "Les roles de {name} ont ete modifies",
    "Nouvelle invitation envoyee a {name}",
    "Connexion depuis un nouvel appareil",
    "Parametres de l'application modifies",
    "{name} a accepte l'invitation",
    "Email verifie par {name}",
]


async def _generate_notifications(db: AsyncSession, ctx: FixtureContext) -> dict[str, Any]:
    """Generate mass notifications distributed across users."""
    scale = ctx.scale
    user_ids = ctx.user_ids
    event_ids = ctx.get("event.event_ids", [])

    if not user_ids:
        return {"error": "No user IDs available."}
    if not event_ids:
        return {"error": "No event IDs available. event fixtures must run first."}

    now = datetime.now(timezone.utc)
    total = scale * 3
    generated = 0

    for _ in range(total):
        user_id = fake.random_element(user_ids)
        event_id = fake.random_element(event_ids)
        days_ago = fake.random_int(min=0, max=60)
        is_read = fake.boolean(chance_of_getting_true=60)

        title = fake.random_element(NOTIFICATION_TEMPLATES).format(name=fake.name())

        created_at = now - timedelta(days=days_ago, hours=fake.random_int(min=0, max=23))
        read_at = None
        if is_read:
            read_delta = fake.random_int(min=0, max=max(1, days_ago))
            read_at = now - timedelta(days=read_delta)

        deleted_at = None
        if fake.boolean(chance_of_getting_true=10):
            del_delta = fake.random_int(min=0, max=max(1, days_ago))
            deleted_at = now - timedelta(days=del_delta)

        notif = Notification(
            user_id=user_id,
            event_id=event_id,
            title=title,
            body=fake.sentence() if fake.boolean(chance_of_getting_true=40) else None,
            is_read=is_read,
            read_at=read_at,
            deleted_at=deleted_at,
            created_at=created_at,
        )
        db.add(notif)
        generated += 1

    await db.flush()

    return {
        "notifications_created": generated,
        "users_covered": len(set(user_ids)),
    }


fixtures = [
    FixtureDefinition(
        name="notification",
        label="Notifications",
        description="Generate mass in-app notifications linked to events",
        depends=["_identity", "event"],
        handler=_generate_notifications,
        check_table="notifications",
        check_min_rows=50,
    ),
]
