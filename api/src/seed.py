"""Seed script with demo data: super admin, demo users, default feature states."""

import asyncio
from datetime import datetime, timezone, timedelta

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from .core.database import engine, async_session, Base
from .core.security import hash_password
from .core._identity.models import User, FeatureState, AppSetting


def ago(days: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days)


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        session: AsyncSession

        # Check if data already exists
        result = await session.execute(select(func.count(User.id)))
        if result.scalar() > 0:
            print("Des donnees existent deja, seed annule.")
            return

        # ── USERS ────────────────────────────────────────────────────

        admin = User(
            email="nathan.provost@kertios.com",
            first_name="Nathan",
            last_name="Provost",
            auth_source="intranet",
            is_super_admin=True,
            must_change_password=False,
            created_at=ago(120),
        )
        session.add(admin)
        await session.flush()

        alice = User(
            email="alice@example.com",
            password_hash=hash_password("demo123"),
            first_name="Alice",
            last_name="Martin",
            auth_source="local",
            is_super_admin=False,
            must_change_password=False,
            created_at=ago(100),
        )
        session.add(alice)

        bob = User(
            email="bob@example.com",
            password_hash=hash_password("demo123"),
            first_name="Bob",
            last_name="Durand",
            auth_source="local",
            is_super_admin=False,
            must_change_password=False,
            created_at=ago(80),
        )
        session.add(bob)

        charlie = User(
            email="charlie@example.com",
            password_hash=hash_password("demo123"),
            first_name="Charlie",
            last_name="Dupont",
            auth_source="local",
            is_super_admin=False,
            must_change_password=False,
            created_at=ago(60),
        )
        session.add(charlie)

        # ── DEFAULT FEATURE STATES ───────────────────────────────────

        default_features = [
            FeatureState(name="notification", is_active=True),
            FeatureState(name="notification.email", is_active=True),
            FeatureState(name="notification.push", is_active=False),
            FeatureState(name="notification.webhook", is_active=True),
        ]
        for fs in default_features:
            session.add(fs)

        # ── DEFAULT APP SETTINGS ────────────────────────────────────

        default_settings = [
            AppSetting(key="app_name", value="Template App"),
            AppSetting(key="app_description", value=""),
            AppSetting(key="app_logo", value="/logo_full.svg"),
            AppSetting(key="app_favicon", value="/favicon.ico"),
            AppSetting(key="primary_color", value="#1E40AF"),
            AppSetting(key="support_email", value=""),
        ]
        for s in default_settings:
            session.add(s)

        await session.commit()

        print()
        print("===================================================")
        print("  Seed termine avec succes !")
        print("===================================================")
        print()
        print("  Comptes disponibles :")
        print("  -----------------------------------------------------")
        print("  nathan.provost@kertios.com  Super Admin  (auth intranet)")
        print("  alice@example.com     Utilisateur  (mdp: demo123)")
        print("  bob@example.com       Utilisateur  (mdp: demo123)")
        print("  charlie@example.com   Utilisateur  (mdp: demo123)")
        print()
        print("  Features actives par defaut :")
        print("  notification, notification.email, notification.webhook")
        print("  notification.push (desactive)")
        print()


if __name__ == "__main__":
    asyncio.run(seed())
