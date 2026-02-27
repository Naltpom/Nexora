"""Partition events and notifications tables with pg_partman (monthly range).

Revision ID: q0r1s2t3u4v5
Revises: p9q0r1s2t3u4
Create Date: 2026-02-27
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "q0r1s2t3u4v5"
down_revision: str | None = "p9q0r1s2t3u4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    conn = op.get_bind()

    # -- 1. Ensure pg_partman extension is available --
    conn.execute(sa.text("CREATE SCHEMA IF NOT EXISTS partman"))
    conn.execute(sa.text("CREATE EXTENSION IF NOT EXISTS pg_partman SCHEMA partman"))

    # -- 2. Drop FK constraints that point TO events (can't reference partitioned tables) --
    conn.execute(sa.text("""
        DO $$
        DECLARE fk_name TEXT;
        BEGIN
            -- notifications.event_id -> events.id
            SELECT conname INTO fk_name
              FROM pg_constraint
             WHERE conrelid = 'notifications'::regclass
               AND confrelid = 'events'::regclass
               AND contype = 'f';
            IF fk_name IS NOT NULL THEN
                EXECUTE format('ALTER TABLE notifications DROP CONSTRAINT %I', fk_name);
            END IF;

            -- webhook_delivery_logs.event_id -> events.id
            BEGIN
                SELECT conname INTO fk_name
                  FROM pg_constraint c
                  JOIN pg_class r ON r.oid = c.conrelid
                 WHERE r.relname = 'webhook_delivery_logs'
                   AND c.confrelid = 'events'::regclass
                   AND c.contype = 'f';
                IF fk_name IS NOT NULL THEN
                    EXECUTE format('ALTER TABLE webhook_delivery_logs DROP CONSTRAINT %I', fk_name);
                END IF;
            EXCEPTION WHEN undefined_table THEN NULL;
            END;
        END $$
    """))

    # -- 3. Partition events table --
    _partition_events(conn)

    # -- 4. Partition notifications table --
    _partition_notifications(conn)


def _partition_events(conn) -> None:
    """Convert events to a range-partitioned table (monthly, by created_at)."""

    # Rename old table
    conn.execute(sa.text("ALTER TABLE events RENAME TO events_old"))

    # Drop old indexes (renaming a table does NOT rename its indexes)
    conn.execute(sa.text("DROP INDEX IF EXISTS ix_events_event_type"))
    conn.execute(sa.text("DROP INDEX IF EXISTS ix_events_created_at"))
    conn.execute(sa.text("DROP INDEX IF EXISTS ix_events_actor_id"))
    conn.execute(sa.text("DROP INDEX IF EXISTS ix_events_resource_id"))

    # Detach sequence so DROP TABLE events_old won't destroy it
    conn.execute(sa.text("""
        DO $$ BEGIN
            ALTER SEQUENCE events_id_seq OWNED BY NONE;
        EXCEPTION WHEN undefined_table THEN NULL;
        END $$
    """))

    # Create new partitioned table with composite PK (id, created_at)
    conn.execute(sa.text("""
        CREATE TABLE events (
            id          INTEGER      NOT NULL DEFAULT nextval('events_id_seq'),
            event_type  VARCHAR(100) NOT NULL,
            actor_id    INTEGER      NOT NULL REFERENCES users(id),
            resource_type VARCHAR(50) NOT NULL,
            resource_id INTEGER      NOT NULL,
            payload     JSONB        NOT NULL DEFAULT '{}',
            created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
            PRIMARY KEY (id, created_at)
        ) PARTITION BY RANGE (created_at)
    """))

    # Re-attach sequence to new table
    conn.execute(sa.text("ALTER SEQUENCE events_id_seq OWNED BY events.id"))

    # Recreate indexes (inherited by future partitions)
    conn.execute(sa.text("CREATE INDEX ix_events_event_type  ON events (event_type)"))
    conn.execute(sa.text("CREATE INDEX ix_events_created_at  ON events (created_at)"))
    conn.execute(sa.text("CREATE INDEX ix_events_actor_id    ON events (actor_id)"))
    conn.execute(sa.text("CREATE INDEX ix_events_resource_id ON events (resource_id)"))

    # Register with pg_partman (creates current month + 3 future monthly partitions + default partition)
    conn.execute(sa.text("""
        SELECT partman.create_parent(
            p_parent_table := 'public.events',
            p_control      := 'created_at',
            p_interval     := '1 month',
            p_premake      := 3
        )
    """))

    # Copy existing data (recent rows go to named partitions, older rows stay in default)
    conn.execute(sa.text("""
        INSERT INTO events (id, event_type, actor_id, resource_type, resource_id, payload, created_at)
        SELECT id, event_type, actor_id, resource_type, resource_id, payload, created_at
          FROM events_old
    """))

    # Advance sequence past existing IDs
    conn.execute(sa.text(
        "SELECT setval('events_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM events), 0), 1))"
    ))

    # Drop old table (CASCADE removes its own outbound FKs/constraints)
    conn.execute(sa.text("DROP TABLE events_old CASCADE"))

    # Run maintenance to finalise partition layout
    conn.execute(sa.text("SELECT partman.run_maintenance('public.events')"))


def _partition_notifications(conn) -> None:
    """Convert notifications to a range-partitioned table (monthly, by created_at)."""

    conn.execute(sa.text("ALTER TABLE notifications RENAME TO notifications_old"))

    # Drop old indexes (renaming a table does NOT rename its indexes)
    conn.execute(sa.text("DROP INDEX IF EXISTS ix_notifications_user_unread"))
    conn.execute(sa.text("DROP INDEX IF EXISTS ix_notifications_user_created"))
    conn.execute(sa.text("DROP INDEX IF EXISTS ix_notifications_event_id"))
    conn.execute(sa.text("DROP INDEX IF EXISTS ix_notifications_user_id"))
    conn.execute(sa.text("DROP INDEX IF EXISTS ix_notifications_created_at"))

    conn.execute(sa.text("""
        DO $$ BEGIN
            ALTER SEQUENCE notifications_id_seq OWNED BY NONE;
        EXCEPTION WHEN undefined_table THEN NULL;
        END $$
    """))

    conn.execute(sa.text("""
        CREATE TABLE notifications (
            id              INTEGER      NOT NULL DEFAULT nextval('notifications_id_seq'),
            user_id         INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            event_id        INTEGER      NOT NULL,
            rule_id         INTEGER      REFERENCES notification_rules(id) ON DELETE SET NULL,
            title           VARCHAR(500) NOT NULL,
            body            TEXT,
            link            VARCHAR(500),
            is_read         BOOLEAN      NOT NULL DEFAULT false,
            read_at         TIMESTAMPTZ,
            email_sent_at   TIMESTAMPTZ,
            webhook_sent_at TIMESTAMPTZ,
            push_sent_at    TIMESTAMPTZ,
            deleted_at      TIMESTAMPTZ,
            created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
            PRIMARY KEY (id, created_at)
        ) PARTITION BY RANGE (created_at)
    """))

    conn.execute(sa.text("ALTER SEQUENCE notifications_id_seq OWNED BY notifications.id"))

    conn.execute(sa.text(
        "CREATE INDEX ix_notifications_user_unread  ON notifications (user_id, is_read, created_at)"
    ))
    conn.execute(sa.text(
        "CREATE INDEX ix_notifications_user_created ON notifications (user_id, created_at)"
    ))
    conn.execute(sa.text(
        "CREATE INDEX ix_notifications_event_id     ON notifications (event_id)"
    ))

    conn.execute(sa.text("""
        SELECT partman.create_parent(
            p_parent_table := 'public.notifications',
            p_control      := 'created_at',
            p_interval     := '1 month',
            p_premake      := 3
        )
    """))

    conn.execute(sa.text("""
        INSERT INTO notifications (id, user_id, event_id, rule_id, title, body, link,
            is_read, read_at, email_sent_at, webhook_sent_at, push_sent_at, deleted_at, created_at)
        SELECT id, user_id, event_id, rule_id, title, body, link,
            is_read, read_at, email_sent_at, webhook_sent_at, push_sent_at, deleted_at, created_at
          FROM notifications_old
    """))

    conn.execute(sa.text(
        "SELECT setval('notifications_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM notifications), 0), 1))"
    ))

    conn.execute(sa.text("DROP TABLE notifications_old CASCADE"))
    conn.execute(sa.text("SELECT partman.run_maintenance('public.notifications')"))


def downgrade() -> None:
    raise RuntimeError(
        "Downgrade from partitioned tables is not supported. "
        "Restore from a database backup instead."
    )
