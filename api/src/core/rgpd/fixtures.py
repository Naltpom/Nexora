"""Mass fixture generator for RGPD: consent records, rights requests, access logs."""

from datetime import datetime, timedelta, timezone
from typing import Any

from faker import Faker
from sqlalchemy.ext.asyncio import AsyncSession

from ..fixture_registry import FixtureContext, FixtureDefinition
from .models import ConsentRecord, DataAccessLog, RightsRequest

fake = Faker("fr_FR")

CONSENT_TYPES = ["necessary", "functional", "analytics", "marketing"]
REQUEST_TYPES = ["access", "rectification", "erasure", "portability", "restriction"]
REQUEST_STATUSES = ["pending", "in_progress", "completed", "rejected"]
ACCESS_ACTIONS = ["view", "export", "modify", "delete"]


async def _generate_rgpd(db: AsyncSession, ctx: FixtureContext) -> dict[str, Any]:
    """Generate RGPD-related fixture data."""
    scale = ctx.scale
    user_ids = ctx.user_ids
    admin_id = ctx.admin_id

    if not user_ids:
        return {"error": "No user IDs available."}

    now = datetime.now(timezone.utc)
    consent_count = 0
    rights_count = 0
    access_log_count = 0

    # Consent records: each user gives consent to 2-4 types
    for user_id in user_ids[:scale]:
        types = fake.random_elements(CONSENT_TYPES, length=fake.random_int(min=2, max=4), unique=True)
        for consent_type in types:
            db.add(ConsentRecord(
                user_id=user_id,
                consent_type=consent_type,
                granted=fake.boolean(chance_of_getting_true=80),
                ip_address=fake.ipv4(),
                user_agent=fake.user_agent(),
                created_at=now - timedelta(days=fake.random_int(min=0, max=180)),
            ))
            consent_count += 1

    # Rights requests: ~10% of users make a request
    request_count = max(1, scale // 10)
    request_user_ids = fake.random_elements(user_ids, length=request_count, unique=False)
    for user_id in request_user_ids:
        status = fake.random_element(REQUEST_STATUSES)
        db.add(RightsRequest(
            user_id=user_id,
            request_type=fake.random_element(REQUEST_TYPES),
            status=status,
            description=fake.sentence(),
            admin_response=fake.sentence() if status in ("completed", "rejected") else None,
            processed_by_id=admin_id if status in ("completed", "rejected") else None,
            completed_at=(
                now - timedelta(days=fake.random_int(min=0, max=30))
                if status == "completed" else None
            ),
            created_at=now - timedelta(days=fake.random_int(min=0, max=90)),
        ))
        rights_count += 1

    # Data access logs
    for _ in range(scale):
        accessor = fake.random_element(user_ids) if admin_id else None
        target = fake.random_element(user_ids)
        db.add(DataAccessLog(
            accessor_id=accessor,
            target_user_id=target,
            resource_type="user",
            resource_id=str(target),
            action=fake.random_element(ACCESS_ACTIONS),
            details=fake.sentence() if fake.boolean(chance_of_getting_true=30) else None,
            ip_address=fake.ipv4(),
            created_at=now - timedelta(days=fake.random_int(min=0, max=60)),
        ))
        access_log_count += 1

    await db.flush()

    return {
        "consent_records": consent_count,
        "rights_requests": rights_count,
        "access_logs": access_log_count,
    }


fixtures = [
    FixtureDefinition(
        name="rgpd",
        label="RGPD / Consent & Audit",
        description="Generate consent records, rights requests, and data access logs",
        depends=["_identity"],
        handler=_generate_rgpd,
        check_table="consent_records",
        check_min_rows=20,
    ),
]
