"""Mass fixture generator for MFA: UserMFA configs, backup codes, email codes."""

import hashlib
from datetime import datetime, timedelta, timezone
from typing import Any

from faker import Faker
from sqlalchemy.ext.asyncio import AsyncSession

from ..fixture_registry import FixtureContext, FixtureDefinition
from .models import MFABackupCode, MFAEmailCode, UserMFA

fake = Faker("fr_FR")


async def _generate_mfa(db: AsyncSession, ctx: FixtureContext) -> dict[str, Any]:
    """Generate MFA configurations for ~30% of users."""
    user_ids = ctx.get("_identity.generated_user_ids", [])

    if not user_ids:
        return {"error": "No generated user IDs available."}

    now = datetime.now(timezone.utc)
    mfa_count = 0
    backup_count = 0
    email_code_count = 0

    # ~30% of users have MFA enabled
    mfa_user_count = max(1, len(user_ids) * 30 // 100)
    mfa_user_ids = fake.random_elements(user_ids, length=mfa_user_count, unique=True)

    for user_id in mfa_user_ids:
        method = fake.random_element(["totp", "email"])

        mfa_entry = UserMFA(
            user_id=user_id,
            method=method,
            is_enabled=True,
            is_primary=True,
            totp_verified=method == "totp",
            totp_secret_encrypted="fixture_encrypted_secret" if method == "totp" else None,
            email_address=fake.email() if method == "email" else None,
            created_at=now - timedelta(days=fake.random_int(min=1, max=180)),
        )
        db.add(mfa_entry)
        mfa_count += 1

        # Generate 8 backup codes per MFA user
        for _ in range(8):
            code = fake.bothify(text="########")
            is_used = fake.boolean(chance_of_getting_true=15)
            db.add(MFABackupCode(
                user_id=user_id,
                code_hash=hashlib.sha256(code.encode()).hexdigest(),
                is_used=is_used,
                used_at=now - timedelta(days=fake.random_int(min=0, max=30)) if is_used else None,
                created_at=now - timedelta(days=fake.random_int(min=1, max=180)),
            ))
            backup_count += 1

        # Recent email code for email method users
        if method == "email":
            code = fake.bothify(text="######")
            db.add(MFAEmailCode(
                user_id=user_id,
                code_hash=hashlib.sha256(code.encode()).hexdigest(),
                expires_at=now + timedelta(minutes=10),
                is_used=False,
                created_at=now - timedelta(minutes=fake.random_int(min=0, max=5)),
            ))
            email_code_count += 1

    await db.flush()

    return {
        "mfa_configs": mfa_count,
        "backup_codes": backup_count,
        "email_codes": email_code_count,
    }


fixtures = [
    FixtureDefinition(
        name="mfa",
        label="MFA Configurations",
        description="Generate MFA configs (TOTP/email), backup codes, email OTP codes",
        depends=["_identity"],
        handler=_generate_mfa,
        check_table="user_mfa",
        check_min_rows=5,
    ),
]
