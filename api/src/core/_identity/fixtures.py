"""Mass fixture generator for _identity: users and role assignments."""

from datetime import datetime, timedelta, timezone
from typing import Any

from faker import Faker
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..fixture_registry import FixtureContext, FixtureDefinition
from ..security import hash_password
from .models import Role, User, UserRole

fake = Faker("fr_FR")


async def _generate_users(db: AsyncSession, ctx: FixtureContext) -> dict[str, Any]:
    """Generate mass users with role assignments.

    Stores generated user IDs and admin ID in context for downstream fixtures.
    """
    scale = ctx.scale
    now = datetime.now(timezone.utc)

    # Load existing roles
    roles_result = await db.execute(select(Role))
    roles = roles_result.scalars().all()
    role_map = {r.slug: r for r in roles}

    if not role_map:
        return {"error": "No roles found in DB. Run bootstrap/seed first."}

    # Get existing admin for context
    admin_result = await db.execute(
        select(User).where(User.email == settings.DEFAULT_ADMIN_EMAIL.lower())
    )
    admin = admin_result.scalar_one_or_none()
    if admin:
        ctx.set("_identity.admin_id", admin.id)

    # Pre-hash a single password for all generated users (bcrypt is slow)
    common_hash = hash_password("fixture123")

    # Assignable roles (exclude super_admin)
    assignable_slugs = [s for s in role_map if s != settings.SUPER_ADMIN_ROLE_SLUG]
    if not assignable_slugs:
        assignable_slugs = list(role_map.keys())

    generated_users: list[User] = []
    used_emails: set[str] = set()

    for _ in range(scale):
        email = fake.unique.email()
        while email in used_emails:
            email = fake.unique.email()
        used_emails.add(email)

        days_ago = fake.random_int(min=1, max=365)
        user = User(
            email=email,
            password_hash=common_hash,
            first_name=fake.first_name(),
            last_name=fake.last_name(),
            auth_source="local",
            is_active=fake.boolean(chance_of_getting_true=90),
            email_verified=fake.boolean(chance_of_getting_true=85),
            must_change_password=False,
            language=fake.random_element(["fr", "en"]),
            last_login=(
                now - timedelta(days=fake.random_int(min=0, max=30))
                if fake.boolean(chance_of_getting_true=70) else None
            ),
            last_active=(
                now - timedelta(hours=fake.random_int(min=0, max=720))
                if fake.boolean(chance_of_getting_true=60) else None
            ),
            created_at=now - timedelta(days=days_ago),
        )
        db.add(user)
        generated_users.append(user)

    await db.flush()

    # Assign roles (weighted random)
    for user in generated_users:
        slug = fake.random_element(assignable_slugs)
        role = role_map[slug]
        db.add(UserRole(user_id=user.id, role_id=role.id))

    await db.flush()

    # Store IDs in context for downstream fixtures
    all_user_ids = [u.id for u in generated_users]
    if admin:
        all_user_ids.append(admin.id)
    ctx.set("_identity.user_ids", all_user_ids)
    ctx.set("_identity.generated_user_ids", [u.id for u in generated_users])

    return {
        "users_created": len(generated_users),
        "password": "fixture123",
        "roles_assigned": len(generated_users),
    }


async def _populate_identity_context(db: AsyncSession, ctx: FixtureContext) -> None:
    """Populate context with existing user IDs when _identity is skipped."""
    result = await db.execute(
        select(User.id).where(User.is_active == True).limit(500)  # noqa: E712
    )
    user_ids = [row[0] for row in result.all()]
    ctx.set("_identity.user_ids", user_ids)

    admin_result = await db.execute(
        select(User).where(User.email == settings.DEFAULT_ADMIN_EMAIL.lower())
    )
    admin = admin_result.scalar_one_or_none()
    if admin:
        ctx.set("_identity.admin_id", admin.id)


fixtures = [
    FixtureDefinition(
        name="_identity",
        label="Users & Roles",
        description="Generate mass users with role assignments",
        depends=[],
        handler=_generate_users,
        populate_context=_populate_identity_context,
        check_table="users",
        check_min_rows=10,
    ),
]
