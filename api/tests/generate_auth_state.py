"""Generate Playwright auth state for smoke tests.

Creates a refresh token + UserSession in DB for the default admin user,
then outputs a Playwright-compatible storageState JSON to stdout.

Usage (inside API container):
    python -m tests.generate_auth_state > /tmp/auth-state.json
"""

import json
import os
import sys
from datetime import datetime, timezone, timedelta

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from src.core.config import settings
from src.core.security import create_refresh_token, hash_refresh_token
from src.core._identity.models import User, UserSession


def main():
    engine = create_engine(settings.database_url_sync)
    try:
        with Session(engine) as db:
            admin = db.execute(
                select(User).where(User.email == settings.DEFAULT_ADMIN_EMAIL.lower())
            ).scalar_one_or_none()

            if admin is None:
                print(f"Admin user {settings.DEFAULT_ADMIN_EMAIL} not found", file=sys.stderr)
                sys.exit(1)

            refresh = create_refresh_token({"sub": str(admin.id)})

            session = UserSession(
                user_id=admin.id,
                refresh_token_hash=hash_refresh_token(refresh),
                ip_address="127.0.0.1",
                user_agent="Playwright Smoke Tests",
                is_revoked=False,
                expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
            )
            db.add(session)
            db.commit()

    finally:
        engine.dispose()

    origin = os.environ.get("PLAYWRIGHT_ORIGIN", "http://localhost:3000")

    # Use a future timestamp instead of -1 (session cookie) to avoid
    # Chromium quirks with session cookies on localhost in headless mode.
    expires = int((datetime.now(timezone.utc) + timedelta(days=7)).timestamp())

    state = {
        "cookies": [
            {
                "name": "refresh_token",
                "value": refresh,
                "domain": "localhost",
                "path": "/api/auth",
                "httpOnly": True,
                "secure": False,
                "sameSite": "Lax",
                "expires": expires,
            }
        ],
        "origins": [
            {
                "origin": origin,
                "localStorage": [
                    {"name": "has_session", "value": "1"},
                    {"name": "rgpd_consent_given", "value": "1"},
                    {"name": "rgpd_consent_necessary", "value": "1"},
                    {"name": "rgpd_consent_functional", "value": "1"},
                ],
            }
        ],
    }

    json.dump(state, sys.stdout, indent=2)


if __name__ == "__main__":
    main()
