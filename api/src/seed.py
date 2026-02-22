"""Seed script with demo data: super admin, demo users, default feature states, demo notifications."""

import asyncio
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .core._identity.models import User
from .core.config import settings as app_settings
from .core.database import Base, async_session, engine
from .core.event.models import Event
from .core.notification.models import Notification
from .core.security import hash_password


def ago(days: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days)


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

        # Check if admin already exists (e.g. created by intranet login)
        admin_email = app_settings.DEFAULT_ADMIN_EMAIL
        result = await session.execute(select(User).where(User.email == admin_email))
        existing_admin = result.scalar_one_or_none()

        # ── USERS ────────────────────────────────────────────────────

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

        await session.flush()

        # ── DEMO EVENTS + NOTIFICATIONS (pour Nathan admin) ───────────

        demo_events = [
            Event(
                event_type="user.registered",
                actor_id=alice.id,
                resource_type="user",
                resource_id=alice.id,
                payload={"actor_name": "Alice Martin", "user_name": "Alice Martin", "email": "alice@example.com"},
                created_at=ago(10),
            ),
            Event(
                event_type="user.registered",
                actor_id=bob.id,
                resource_type="user",
                resource_id=bob.id,
                payload={"actor_name": "Bob Durand", "user_name": "Bob Durand", "email": "bob@example.com"},
                created_at=ago(8),
            ),
            Event(
                event_type="user.registered",
                actor_id=charlie.id,
                resource_type="user",
                resource_id=charlie.id,
                payload={"actor_name": "Charlie Dupont", "user_name": "Charlie Dupont", "email": "charlie@example.com"},
                created_at=ago(6),
            ),
            Event(
                event_type="user.updated",
                actor_id=alice.id,
                resource_type="user",
                resource_id=alice.id,
                payload={"actor_name": "Alice Martin"},
                created_at=ago(5),
            ),
            Event(
                event_type="user.invited",
                actor_id=admin.id,
                resource_type="user",
                resource_id=bob.id,
                payload={"actor_name": "Nathan Provost", "invited_email": "nouveau@example.com"},
                created_at=ago(4),
            ),
            Event(
                event_type="user.updated",
                actor_id=bob.id,
                resource_type="user",
                resource_id=bob.id,
                payload={"actor_name": "Bob Durand"},
                created_at=ago(3),
            ),
            Event(
                event_type="user.deactivated",
                actor_id=admin.id,
                resource_type="user",
                resource_id=charlie.id,
                payload={"actor_name": "Nathan Provost", "target_name": "Charlie Dupont"},
                created_at=ago(2),
            ),
            Event(
                event_type="admin.impersonation_started",
                actor_id=admin.id,
                resource_type="user",
                resource_id=alice.id,
                payload={"actor_name": "Nathan Provost", "target_name": "Alice Martin"},
                created_at=ago(1),
            ),
            Event(
                event_type="user.registered",
                actor_id=alice.id,
                resource_type="user",
                resource_id=alice.id,
                payload={"actor_name": "Alice Martin", "user_name": "Diane Leroy", "email": "diane@example.com"},
                created_at=ago(0),
            ),
            Event(
                event_type="user.updated",
                actor_id=charlie.id,
                resource_type="user",
                resource_id=charlie.id,
                payload={"actor_name": "Charlie Dupont"},
                created_at=ago(0),
            ),
        ]
        for ev in demo_events:
            session.add(ev)
        await session.flush()

        now = datetime.now(timezone.utc)

        demo_notifications = [
            # ── Unread ──
            Notification(
                user_id=admin.id, event_id=demo_events[0].id,
                title="Alice Martin s'est inscrit",
                body="Nouvel utilisateur enregistre sur la plateforme.",
                is_read=False, created_at=ago(10),
            ),
            Notification(
                user_id=admin.id, event_id=demo_events[1].id,
                title="Bob Durand s'est inscrit",
                body=None,
                is_read=False, created_at=ago(8),
            ),
            Notification(
                user_id=admin.id, event_id=demo_events[2].id,
                title="Charlie Dupont s'est inscrit",
                body="Inscription via lien d'invitation.",
                is_read=False, created_at=ago(6),
            ),
            Notification(
                user_id=admin.id, event_id=demo_events[8].id,
                title="Diane Leroy s'est inscrit",
                body=None,
                is_read=False, created_at=ago(0),
            ),
            # ── Read ──
            Notification(
                user_id=admin.id, event_id=demo_events[3].id,
                title="Alice Martin a mis a jour son profil",
                body=None,
                is_read=True, read_at=ago(4), created_at=ago(5),
            ),
            Notification(
                user_id=admin.id, event_id=demo_events[5].id,
                title="Bob Durand a mis a jour son profil",
                body="Changement d'adresse email.",
                is_read=True, read_at=ago(2), created_at=ago(3),
            ),
            Notification(
                user_id=admin.id, event_id=demo_events[9].id,
                title="Charlie Dupont a mis a jour son profil",
                body=None,
                is_read=True, read_at=now, created_at=ago(0),
            ),
            # ── Soft-deleted ──
            Notification(
                user_id=admin.id, event_id=demo_events[4].id,
                title="Nathan Provost a invite nouveau@example.com",
                body="Invitation envoyee par email.",
                is_read=True, read_at=ago(3),
                deleted_at=ago(2), created_at=ago(4),
            ),
            Notification(
                user_id=admin.id, event_id=demo_events[6].id,
                title="Nathan Provost a desactive Charlie Dupont",
                body="Compte utilisateur desactive.",
                is_read=False,
                deleted_at=ago(1), created_at=ago(2),
            ),
            Notification(
                user_id=admin.id, event_id=demo_events[7].id,
                title="Nathan Provost impersonifie Alice Martin",
                body=None,
                is_read=True, read_at=ago(0),
                deleted_at=now, created_at=ago(1),
            ),
        ]
        for notif in demo_notifications:
            session.add(notif)

        # ── Extra events for Alice, Bob, Charlie notifications ──────

        extra_events = [
            # Alice notifications
            Event(event_type="user.registered", actor_id=bob.id, resource_type="user", resource_id=bob.id, payload={"actor_name": "Bob Durand", "user_name": "Bob Durand"}, created_at=ago(9)),
            Event(event_type="user.updated", actor_id=admin.id, resource_type="user", resource_id=admin.id, payload={"actor_name": "Nathan Provost"}, created_at=ago(7)),
            Event(event_type="user.invited", actor_id=admin.id, resource_type="user", resource_id=alice.id, payload={"actor_name": "Nathan Provost", "invited_email": "alice@example.com"}, created_at=ago(5)),
            Event(event_type="user.registered", actor_id=charlie.id, resource_type="user", resource_id=charlie.id, payload={"actor_name": "Charlie Dupont", "user_name": "Charlie Dupont"}, created_at=ago(3)),
            Event(event_type="user.deactivated", actor_id=admin.id, resource_type="user", resource_id=bob.id, payload={"actor_name": "Nathan Provost", "target_name": "Bob Durand"}, created_at=ago(1)),
            # Bob notifications
            Event(event_type="user.registered", actor_id=alice.id, resource_type="user", resource_id=alice.id, payload={"actor_name": "Alice Martin", "user_name": "Alice Martin"}, created_at=ago(11)),
            Event(event_type="user.updated", actor_id=charlie.id, resource_type="user", resource_id=charlie.id, payload={"actor_name": "Charlie Dupont"}, created_at=ago(8)),
            Event(event_type="user.invited", actor_id=admin.id, resource_type="user", resource_id=bob.id, payload={"actor_name": "Nathan Provost", "invited_email": "bob@example.com"}, created_at=ago(6)),
            Event(event_type="user.registered", actor_id=charlie.id, resource_type="user", resource_id=charlie.id, payload={"actor_name": "Charlie Dupont", "user_name": "Charlie Dupont"}, created_at=ago(4)),
            Event(event_type="admin.impersonation_started", actor_id=admin.id, resource_type="user", resource_id=bob.id, payload={"actor_name": "Nathan Provost", "target_name": "Bob Durand"}, created_at=ago(2)),
            Event(event_type="user.updated", actor_id=alice.id, resource_type="user", resource_id=alice.id, payload={"actor_name": "Alice Martin"}, created_at=ago(0)),
            # Charlie notifications
            Event(event_type="user.registered", actor_id=alice.id, resource_type="user", resource_id=alice.id, payload={"actor_name": "Alice Martin", "user_name": "Alice Martin"}, created_at=ago(12)),
            Event(event_type="user.registered", actor_id=bob.id, resource_type="user", resource_id=bob.id, payload={"actor_name": "Bob Durand", "user_name": "Bob Durand"}, created_at=ago(10)),
            Event(event_type="user.updated", actor_id=admin.id, resource_type="user", resource_id=admin.id, payload={"actor_name": "Nathan Provost"}, created_at=ago(7)),
            Event(event_type="user.invited", actor_id=admin.id, resource_type="user", resource_id=charlie.id, payload={"actor_name": "Nathan Provost", "invited_email": "charlie@example.com"}, created_at=ago(4)),
        ]
        for ev in extra_events:
            session.add(ev)
        await session.flush()

        ex = extra_events  # shorthand
        extra_notifications = [
            # ── Alice (2 unread, 2 read, 1 deleted) ──
            Notification(user_id=alice.id, event_id=ex[0].id, title="Bob Durand s'est inscrit", body="Nouveau membre dans votre equipe.", is_read=False, created_at=ago(9)),
            Notification(user_id=alice.id, event_id=ex[1].id, title="Nathan Provost a mis a jour son profil", is_read=False, created_at=ago(7)),
            Notification(user_id=alice.id, event_id=ex[2].id, title="Vous avez ete invite par Nathan Provost", body="Verifiez vos parametres.", is_read=True, read_at=ago(4), created_at=ago(5)),
            Notification(user_id=alice.id, event_id=ex[3].id, title="Charlie Dupont s'est inscrit", is_read=True, read_at=ago(2), created_at=ago(3)),
            Notification(user_id=alice.id, event_id=ex[4].id, title="Nathan Provost a desactive Bob Durand", body="Compte desactive.", is_read=True, read_at=ago(0), deleted_at=ago(0), created_at=ago(1)),
            # ── Bob (3 unread, 2 read, 1 deleted) ──
            Notification(user_id=bob.id, event_id=ex[5].id, title="Alice Martin s'est inscrit", is_read=True, read_at=ago(10), created_at=ago(11)),
            Notification(user_id=bob.id, event_id=ex[6].id, title="Charlie Dupont a mis a jour son profil", is_read=True, read_at=ago(7), created_at=ago(8)),
            Notification(user_id=bob.id, event_id=ex[7].id, title="Vous avez ete invite par Nathan Provost", body="Bienvenue sur la plateforme.", is_read=False, created_at=ago(6)),
            Notification(user_id=bob.id, event_id=ex[8].id, title="Charlie Dupont s'est inscrit", body="Nouveau collegue.", is_read=False, created_at=ago(4)),
            Notification(user_id=bob.id, event_id=ex[9].id, title="Nathan Provost impersonifie votre compte", is_read=False, created_at=ago(2)),
            Notification(user_id=bob.id, event_id=ex[10].id, title="Alice Martin a mis a jour son profil", is_read=True, read_at=now, deleted_at=ago(0), created_at=ago(0)),
            # ── Charlie (2 unread, 2 read) ──
            Notification(user_id=charlie.id, event_id=ex[11].id, title="Alice Martin s'est inscrit", is_read=True, read_at=ago(11), created_at=ago(12)),
            Notification(user_id=charlie.id, event_id=ex[12].id, title="Bob Durand s'est inscrit", body="Nouveau membre.", is_read=True, read_at=ago(9), created_at=ago(10)),
            Notification(user_id=charlie.id, event_id=ex[13].id, title="Nathan Provost a mis a jour son profil", is_read=False, created_at=ago(7)),
            Notification(user_id=charlie.id, event_id=ex[14].id, title="Vous avez ete invite par Nathan Provost", is_read=False, created_at=ago(4)),
        ]
        for notif in extra_notifications:
            session.add(notif)

        await session.commit()

        print()
        print("===================================================")
        print("  Seed termine avec succes !")
        print("===================================================")
        print()
        print("  Comptes demo disponibles :")
        print("  -----------------------------------------------------")
        print(f"  {admin_email}  Super Admin  (auth {'intranet' if admin.auth_source == 'intranet' else 'local'})")
        print("  alice@example.com     Utilisateur  (mdp: demo123)")
        print("  bob@example.com       Utilisateur  (mdp: demo123)")
        print("  charlie@example.com   Utilisateur  (mdp: demo123)")
        print()


if __name__ == "__main__":
    asyncio.run(seed())
