"""Shared fixtures for smoke tests.

The tests run inside the API container against the live server on localhost:8000.
"""

import pytest
import httpx
from sqlalchemy import select

from src.core.config import settings
from src.core.security import create_access_token
from src.core.database import engine, async_session


@pytest.fixture(scope="session")
def base_url():
    return "http://localhost:8000"


@pytest.fixture(scope="session")
def auth_token():
    """Generate a JWT for the default admin user (super_admin).

    Uses a sync DB query to look up the admin user, then creates a token.
    """
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session
    from src.core._identity.models import User

    sync_engine = create_engine(settings.database_url_sync)
    try:
        with Session(sync_engine) as db:
            admin = db.execute(
                select(User).where(User.email == settings.DEFAULT_ADMIN_EMAIL.lower())
            ).scalar_one_or_none()
    finally:
        sync_engine.dispose()

    if admin is None:
        pytest.skip(f"Admin user {settings.DEFAULT_ADMIN_EMAIL} not found in DB")

    return create_access_token({
        "sub": str(admin.id),
        "email": admin.email,
        "lang": "fr",
    })


@pytest.fixture(scope="session")
def client(base_url):
    """Unauthenticated sync HTTP client hitting the live API server."""
    with httpx.Client(base_url=base_url, timeout=10.0) as c:
        yield c


@pytest.fixture(scope="session")
def auth_client(base_url, auth_token):
    """Authenticated sync HTTP client (super_admin)."""
    with httpx.Client(
        base_url=base_url,
        timeout=10.0,
        headers={"Authorization": f"Bearer {auth_token}"},
    ) as c:
        yield c
