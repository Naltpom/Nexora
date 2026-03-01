"""Mass fixture generator for SSO: linked OAuth2 accounts."""

from datetime import datetime, timedelta, timezone
from typing import Any

from faker import Faker
from sqlalchemy.ext.asyncio import AsyncSession

from ..fixture_registry import FixtureContext, FixtureDefinition
from .models import SSOAccount

fake = Faker("fr_FR")

PROVIDERS = ["google", "github"]


async def _generate_sso(db: AsyncSession, ctx: FixtureContext) -> dict[str, Any]:
    """Generate SSO accounts for ~20% of users."""
    user_ids = ctx.get("_identity.generated_user_ids", [])

    if not user_ids:
        return {"error": "No generated user IDs available."}

    now = datetime.now(timezone.utc)
    sso_count = 0

    # ~20% of users have an SSO account
    sso_user_count = max(1, len(user_ids) * 20 // 100)
    sso_user_ids = fake.random_elements(user_ids, length=sso_user_count, unique=True)

    for user_id in sso_user_ids:
        provider = fake.random_element(PROVIDERS)

        db.add(SSOAccount(
            user_id=user_id,
            provider=provider,
            provider_user_id=str(fake.random_int(min=100000, max=9999999)),
            provider_email=fake.email(),
            provider_name=fake.name(),
            provider_avatar_url=f"https://i.pravatar.cc/150?u={fake.uuid4()}",
            created_at=now - timedelta(days=fake.random_int(min=1, max=180)),
            last_login_at=(
                now - timedelta(days=fake.random_int(min=0, max=30))
                if fake.boolean(chance_of_getting_true=60) else None
            ),
        ))
        sso_count += 1

    await db.flush()

    return {"sso_accounts": sso_count}


fixtures = [
    FixtureDefinition(
        name="sso",
        label="SSO Accounts",
        description="Generate linked OAuth2 accounts (Google, GitHub)",
        depends=["_identity"],
        handler=_generate_sso,
        check_table="sso_accounts",
        check_min_rows=5,
    ),
]
