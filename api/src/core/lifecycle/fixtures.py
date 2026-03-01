"""Mass fixture generator for lifecycle: sent lifecycle emails."""

from datetime import datetime, timedelta, timezone
from typing import Any

from faker import Faker
from sqlalchemy.ext.asyncio import AsyncSession

from ..fixture_registry import FixtureContext, FixtureDefinition
from .models import LifecycleEmail

fake = Faker("fr_FR")

EMAIL_TYPES = [
    "inactivity_warning",
    "archive_pending",
    "deletion_pending",
    "welcome",
    "reactivation",
]


async def _generate_lifecycle(db: AsyncSession, ctx: FixtureContext) -> dict[str, Any]:
    """Generate lifecycle emails for ~15% of users."""
    user_ids = ctx.get("_identity.generated_user_ids", [])

    if not user_ids:
        return {"error": "No generated user IDs available."}

    now = datetime.now(timezone.utc)
    lifecycle_count = 0

    # ~15% of users have lifecycle emails
    lifecycle_user_count = max(1, len(user_ids) * 15 // 100)
    lifecycle_user_ids = fake.random_elements(user_ids, length=lifecycle_user_count, unique=True)

    # Track (user_id, email_type) to respect unique constraint
    seen: set[tuple[int, str]] = set()

    for user_id in lifecycle_user_ids:
        # Each user gets 1-2 random email types
        types = fake.random_elements(EMAIL_TYPES, length=fake.random_int(min=1, max=2), unique=True)
        for email_type in types:
            key = (user_id, email_type)
            if key in seen:
                continue
            seen.add(key)

            db.add(LifecycleEmail(
                user_id=user_id,
                email_type=email_type,
                sent_at=now - timedelta(days=fake.random_int(min=0, max=90)),
            ))
            lifecycle_count += 1

    await db.flush()

    return {"lifecycle_emails": lifecycle_count}


fixtures = [
    FixtureDefinition(
        name="lifecycle",
        label="Lifecycle Emails",
        description="Generate lifecycle email records (inactivity warnings, archive notices)",
        depends=["_identity"],
        handler=_generate_lifecycle,
        check_table="lifecycle_emails",
        check_min_rows=5,
    ),
]
