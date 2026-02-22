"""Seed script with demo data: super admin, demo users, role assignments, demo notifications.

Data definitions are imported from ``alembic.fixtures`` so this script
stays thin and focused on the insertion logic.
"""

import asyncio
import importlib.util
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .core._identity.models import Permission, Role, RolePermission, User, UserRole
from .core.config import settings as app_settings
from .core.database import Base, async_session, engine
from .core.event.models import Event
from .core.notification.models import Notification
from .core.security import hash_password

# ── Load fixtures via importlib (avoids clash with installed ``alembic`` pkg) ─
_FIXTURES_DIR = Path(__file__).resolve().parent.parent / "alembic" / "fixtures"


def _load_fixture(name: str):
    spec = importlib.util.spec_from_file_location(name, _FIXTURES_DIR / f"{name}.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


_evt = _load_fixture("demo_events")
ADMIN_EVENTS, ALICE_EVENTS = _evt.ADMIN_EVENTS, _evt.ALICE_EVENTS
BOB_EVENTS, CHARLIE_EVENTS = _evt.BOB_EVENTS, _evt.CHARLIE_EVENTS

_notif = _load_fixture("demo_notifications")
ADMIN_NOTIFICATIONS, ALICE_NOTIFICATIONS = _notif.ADMIN_NOTIFICATIONS, _notif.ALICE_NOTIFICATIONS
BOB_NOTIFICATIONS, CHARLIE_NOTIFICATIONS = _notif.BOB_NOTIFICATIONS, _notif.CHARLIE_NOTIFICATIONS

GLOBAL_PERMISSION_CODES = _load_fixture("global_permissions").GLOBAL_PERMISSION_CODES
_role_perms = _load_fixture("role_permissions")
ROLE_PERMISSION_MAP = _role_perms.ROLE_PERMISSION_MAP
ROLES = _load_fixture("roles").ROLES
DEMO_USERS = _load_fixture("users").DEMO_USERS


def ago(days: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days)


def _build_event(tmpl: dict, user_map: dict[str, User]) -> Event:
    actor = user_map[tmpl["actor"]]
    resource = user_map[tmpl["resource"]]
    return Event(
        event_type=tmpl["event_type"],
        actor_id=actor.id,
        resource_type=tmpl["resource_type"],
        resource_id=resource.id,
        payload=tmpl["payload"],
        created_at=ago(tmpl["days_ago"]),
    )


def _build_notification(
    tmpl: dict, user_id: int, events: list[Event],
) -> Notification:
    now = datetime.now(timezone.utc)
    kwargs: dict = {
        "user_id": user_id,
        "event_id": events[tmpl["event_idx"]].id,
        "title": tmpl["title"],
        "body": tmpl.get("body"),
        "is_read": tmpl["is_read"],
        "created_at": ago(tmpl["days_ago"]),
    }
    if tmpl.get("read_days_ago") is not None:
        kwargs["read_at"] = ago(tmpl["read_days_ago"]) if tmpl["read_days_ago"] > 0 else now
    if tmpl.get("deleted_days_ago") is not None:
        kwargs["deleted_at"] = ago(tmpl["deleted_days_ago"]) if tmpl["deleted_days_ago"] > 0 else now
    return Notification(**kwargs)


async def _assign_role(session: AsyncSession, user_id: int, role_slug: str) -> None:
    """Assign a role (by slug) to a user if not already assigned."""
    result = await session.execute(select(Role).where(Role.slug == role_slug))
    role = result.scalar_one_or_none()
    if not role:
        return
    existing = await session.execute(
        select(UserRole).where(UserRole.user_id == user_id, UserRole.role_id == role.id)
    )
    if not existing.scalar_one_or_none():
        session.add(UserRole(user_id=user_id, role_id=role.id))


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        session: AsyncSession

        # Check if demo users already exist
        result = await session.execute(select(User).where(User.email == "alice@example.com"))
        if result.scalar_one_or_none():
            print("Les donnees de demo existent deja, seed annule.")
            return

        # ── Admin user ────────────────────────────────────────────────
        admin_email = app_settings.DEFAULT_ADMIN_EMAIL
        result = await session.execute(select(User).where(User.email == admin_email))
        existing_admin = result.scalar_one_or_none()

        if existing_admin:
            admin = existing_admin
            admin.is_super_admin = True
        else:
            admin_parts = admin_email.split("@")[0].split(".")
            admin_first = admin_parts[0].capitalize() if len(admin_parts) > 0 else "Admin"
            admin_last = admin_parts[1].capitalize() if len(admin_parts) > 1 else ""
            admin = User(
                email=admin_email,
                first_name=admin_first,
                last_name=admin_last,
                auth_source="intranet" if app_settings.INTRANET_EMAIL_DOMAIN and admin_email.endswith(f"@{app_settings.INTRANET_EMAIL_DOMAIN}") else "local",
                is_super_admin=True,
                must_change_password=False,
                created_at=ago(120),
            )
            session.add(admin)
        await session.flush()

        # Assign super_admin role
        await _assign_role(session, admin.id, app_settings.SUPER_ADMIN_ROLE_SLUG)

        # ── Roles from fixtures ────────────────────────────────────────
        for role_data in ROLES:
            existing_role = await session.execute(
                select(Role).where(Role.slug == role_data["slug"])
            )
            if not existing_role.scalar_one_or_none():
                session.add(Role(
                    slug=role_data["slug"],
                    name=role_data["name"],
                    description=role_data["description"],
                ))
        await session.flush()

        # Assign role permissions (from ROLE_PERMISSION_MAP + global codes)
        for role_slug, perm_codes in ROLE_PERMISSION_MAP.items():
            role_result = await session.execute(
                select(Role).where(Role.slug == role_slug)
            )
            role_obj = role_result.scalar_one_or_none()
            if not role_obj:
                continue
            all_codes = list(set(perm_codes + GLOBAL_PERMISSION_CODES))
            for code in all_codes:
                perm_result = await session.execute(
                    select(Permission).where(Permission.code == code)
                )
                perm = perm_result.scalar_one_or_none()
                if perm:
                    existing_rp = await session.execute(
                        select(RolePermission).where(
                            RolePermission.role_id == role_obj.id,
                            RolePermission.permission_id == perm.id,
                        )
                    )
                    if not existing_rp.scalar_one_or_none():
                        session.add(RolePermission(
                            role_id=role_obj.id, permission_id=perm.id,
                        ))
        await session.flush()

        # ── Demo users (from fixtures) ────────────────────────────────
        demo_user_objects: dict[str, User] = {}
        for u in DEMO_USERS:
            user = User(
                email=u["email"],
                password_hash=hash_password(u["password"]),
                first_name=u["first_name"],
                last_name=u["last_name"],
                auth_source=u["auth_source"],
                is_super_admin=u["is_super_admin"],
                must_change_password=False,
                created_at=ago(u["created_days_ago"]),
            )
            session.add(user)
            # Key = first name lowercase (alice, bob, charlie)
            demo_user_objects[u["first_name"].lower()] = user

        await session.flush()

        # Assign roles to demo users
        for u in DEMO_USERS:
            user_obj = demo_user_objects[u["first_name"].lower()]
            await _assign_role(session, user_obj.id, u["role_slug"])
        await session.flush()

        # User map for event building
        alice = demo_user_objects["alice"]
        bob = demo_user_objects["bob"]
        charlie = demo_user_objects["charlie"]
        user_map = {"admin": admin, "alice": alice, "bob": bob, "charlie": charlie}

        # ── Events (from fixtures) ────────────────────────────────────
        admin_events = [_build_event(t, user_map) for t in ADMIN_EVENTS]
        for ev in admin_events:
            session.add(ev)
        await session.flush()

        alice_events = [_build_event(t, user_map) for t in ALICE_EVENTS]
        bob_events = [_build_event(t, user_map) for t in BOB_EVENTS]
        charlie_events = [_build_event(t, user_map) for t in CHARLIE_EVENTS]
        for ev in alice_events + bob_events + charlie_events:
            session.add(ev)
        await session.flush()

        # ── Notifications (from fixtures) ─────────────────────────────
        for tmpl in ADMIN_NOTIFICATIONS:
            session.add(_build_notification(tmpl, admin.id, admin_events))
        for tmpl in ALICE_NOTIFICATIONS:
            session.add(_build_notification(tmpl, alice.id, alice_events))
        for tmpl in BOB_NOTIFICATIONS:
            session.add(_build_notification(tmpl, bob.id, bob_events))
        for tmpl in CHARLIE_NOTIFICATIONS:
            session.add(_build_notification(tmpl, charlie.id, charlie_events))

        await session.commit()

        print()
        print("===================================================")
        print("  Seed termine avec succes !")
        print("===================================================")
        print()
        print("  Comptes demo disponibles :")
        print("  -----------------------------------------------------")
        print(f"  {admin_email}  Super Admin  (auth {'intranet' if admin.auth_source == 'intranet' else 'local'})")
        for u in DEMO_USERS:
            print(f"  {u['email']:24s} {u['first_name']} {u['last_name']:12s} (mdp: {u['password']})")
        print()


if __name__ == "__main__":
    asyncio.run(seed())
