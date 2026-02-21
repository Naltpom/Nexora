"""SWOT corrections phases 1-5: FK/indexes, JSONB preferences, encryption,
sessions/delivery-logs/soft-delete, RBAC super_admin, JSONB constraints.

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-02-21 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # =====================================================================
    # Phase 1 — FK, ondelete, indexes
    # =====================================================================

    # W1: Add indexes on events.actor_id and events.resource_id
    op.create_index("ix_events_actor_id", "events", ["actor_id"])
    op.create_index("ix_events_resource_id", "events", ["resource_id"])

    # W2: Fix ondelete on notifications.user_id (add CASCADE)
    op.drop_constraint("notifications_user_id_fkey", "notifications", type_="foreignkey")
    op.create_foreign_key(
        "notifications_user_id_fkey", "notifications", "users",
        ["user_id"], ["id"], ondelete="CASCADE",
    )

    # W2: Fix notification_rules.created_by_id — make nullable + SET NULL
    op.alter_column("notification_rules", "created_by_id", nullable=True)
    op.drop_constraint("notification_rules_created_by_id_fkey", "notification_rules", type_="foreignkey")
    op.create_foreign_key(
        "notification_rules_created_by_id_fkey", "notification_rules", "users",
        ["created_by_id"], ["id"], ondelete="SET NULL",
    )

    # W2: Fix webhooks.user_id — add SET NULL
    op.drop_constraint("webhooks_user_id_fkey", "webhooks", type_="foreignkey")
    op.create_foreign_key(
        "webhooks_user_id_fkey", "webhooks", "users",
        ["user_id"], ["id"], ondelete="SET NULL",
    )

    # W3: Add FK on impersonation_actions.session_id
    # First clean orphan rows that reference non-existent sessions
    op.execute("""
        DELETE FROM impersonation_actions
        WHERE session_id NOT IN (SELECT session_id FROM impersonation_logs)
    """)
    op.create_foreign_key(
        "impersonation_actions_session_id_fkey", "impersonation_actions", "impersonation_logs",
        ["session_id"], ["session_id"], ondelete="CASCADE",
    )

    # =====================================================================
    # Phase 2 — User.preferences Text → JSONB
    # =====================================================================

    op.execute("""
        ALTER TABLE users
        ALTER COLUMN preferences TYPE jsonb
        USING CASE
            WHEN preferences IS NULL THEN NULL
            WHEN preferences = '' THEN NULL
            ELSE preferences::jsonb
        END
    """)

    # =====================================================================
    # Phase 3 — Encryption at-rest (data migration done at app level)
    # No DDL changes needed — encryption is applied in Python code.
    # HMAC-SHA256 for SecurityToken — no migration needed (short-lived tokens).
    # =====================================================================

    # =====================================================================
    # Phase 4 — New tables + soft delete
    # =====================================================================

    # W5: user_sessions table
    op.create_table(
        "user_sessions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("refresh_token_hash", sa.String(255), nullable=False, unique=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.String(500), nullable=True),
        sa.Column("is_revoked", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_user_sessions_user_active", "user_sessions", ["user_id", "is_revoked"])

    # W7: webhook_delivery_logs table
    op.create_table(
        "webhook_delivery_logs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("webhook_id", sa.Integer(), sa.ForeignKey("webhooks.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("event_id", sa.Integer(), sa.ForeignKey("events.id", ondelete="SET NULL"), nullable=True),
        sa.Column("status_code", sa.Integer(), nullable=True),
        sa.Column("success", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(), index=True),
    )
    op.create_index("ix_webhook_delivery_logs_webhook_created", "webhook_delivery_logs", ["webhook_id", "created_at"])

    # T6: Soft delete — add deleted_at to users
    op.add_column("users", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))

    # =====================================================================
    # Phase 5 — super_admin RBAC role + JSONB validation
    # =====================================================================

    # T2: Create super_admin role and assign to existing super admins
    op.execute("""
        INSERT INTO roles (name, description, created_at, updated_at)
        VALUES ('super_admin', 'Super administrateur — acces complet', NOW(), NOW())
        ON CONFLICT (name) DO NOTHING
    """)

    # Grant ALL existing permissions to super_admin role
    op.execute("""
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id
        FROM roles r, permissions p
        WHERE r.name = 'super_admin'
        ON CONFLICT DO NOTHING
    """)

    # Assign super_admin role to users with is_super_admin = true
    op.execute("""
        INSERT INTO user_roles (user_id, role_id)
        SELECT u.id, r.id
        FROM users u, roles r
        WHERE u.is_super_admin = true AND r.name = 'super_admin'
        ON CONFLICT DO NOTHING
    """)

    # T7/W8: Clean JSONB null values (JSON null != SQL NULL) before constraints
    op.execute("UPDATE notification_rules SET event_types = NULL WHERE jsonb_typeof(event_types) = 'null'")
    op.execute("UPDATE notification_rules SET target_user_ids = NULL WHERE jsonb_typeof(target_user_ids) = 'null'")
    op.execute("UPDATE notification_rules SET webhook_ids = NULL WHERE jsonb_typeof(webhook_ids) = 'null'")
    op.execute("UPDATE webhooks SET event_types = NULL WHERE jsonb_typeof(event_types) = 'null'")
    op.execute("UPDATE webhooks SET notification_rule_ids = NULL WHERE jsonb_typeof(notification_rule_ids) = 'null'")
    op.execute("UPDATE mfa_role_policies SET allowed_methods = NULL WHERE jsonb_typeof(allowed_methods) = 'null'")
    op.execute("UPDATE user_rule_preferences SET webhook_ids = NULL WHERE jsonb_typeof(webhook_ids) = 'null'")

    # T7/W8: JSONB CHECK constraints
    op.execute("""
        ALTER TABLE notification_rules
        ADD CONSTRAINT check_event_types_is_array
        CHECK (event_types IS NULL OR jsonb_typeof(event_types) = 'array')
    """)
    op.execute("""
        ALTER TABLE notification_rules
        ADD CONSTRAINT check_target_user_ids_is_array
        CHECK (target_user_ids IS NULL OR jsonb_typeof(target_user_ids) = 'array')
    """)
    op.execute("""
        ALTER TABLE notification_rules
        ADD CONSTRAINT check_webhook_ids_is_array
        CHECK (webhook_ids IS NULL OR jsonb_typeof(webhook_ids) = 'array')
    """)
    op.execute("""
        ALTER TABLE webhooks
        ADD CONSTRAINT check_webhooks_event_types_is_array
        CHECK (event_types IS NULL OR jsonb_typeof(event_types) = 'array')
    """)
    op.execute("""
        ALTER TABLE webhooks
        ADD CONSTRAINT check_webhooks_notification_rule_ids_is_array
        CHECK (notification_rule_ids IS NULL OR jsonb_typeof(notification_rule_ids) = 'array')
    """)
    op.execute("""
        ALTER TABLE mfa_role_policies
        ADD CONSTRAINT check_allowed_methods_is_array
        CHECK (allowed_methods IS NULL OR jsonb_typeof(allowed_methods) = 'array')
    """)
    op.execute("""
        ALTER TABLE user_rule_preferences
        ADD CONSTRAINT check_urp_webhook_ids_is_array
        CHECK (webhook_ids IS NULL OR jsonb_typeof(webhook_ids) = 'array')
    """)

    # GIN indexes for JSONB array columns that may be queried with @>
    op.execute("""
        CREATE INDEX ix_notification_rules_event_types_gin
        ON notification_rules USING gin(event_types)
    """)
    op.execute("""
        CREATE INDEX ix_webhooks_event_types_gin
        ON webhooks USING gin(event_types)
    """)


def downgrade() -> None:
    # Phase 5 — reverse
    op.execute("DROP INDEX IF EXISTS ix_webhooks_event_types_gin")
    op.execute("DROP INDEX IF EXISTS ix_notification_rules_event_types_gin")

    op.execute("ALTER TABLE user_rule_preferences DROP CONSTRAINT IF EXISTS check_urp_webhook_ids_is_array")
    op.execute("ALTER TABLE mfa_role_policies DROP CONSTRAINT IF EXISTS check_allowed_methods_is_array")
    op.execute("ALTER TABLE webhooks DROP CONSTRAINT IF EXISTS check_webhooks_notification_rule_ids_is_array")
    op.execute("ALTER TABLE webhooks DROP CONSTRAINT IF EXISTS check_webhooks_event_types_is_array")
    op.execute("ALTER TABLE notification_rules DROP CONSTRAINT IF EXISTS check_webhook_ids_is_array")
    op.execute("ALTER TABLE notification_rules DROP CONSTRAINT IF EXISTS check_target_user_ids_is_array")
    op.execute("ALTER TABLE notification_rules DROP CONSTRAINT IF EXISTS check_event_types_is_array")

    # Remove super_admin role assignments (but keep role for safety)
    op.execute("""
        DELETE FROM user_roles
        WHERE role_id = (SELECT id FROM roles WHERE name = 'super_admin')
    """)
    op.execute("""
        DELETE FROM role_permissions
        WHERE role_id = (SELECT id FROM roles WHERE name = 'super_admin')
    """)

    # Phase 4 — reverse
    op.drop_column("users", "deleted_at")
    op.drop_table("webhook_delivery_logs")
    op.drop_table("user_sessions")

    # Phase 2 — reverse (JSONB → Text)
    op.execute("""
        ALTER TABLE users
        ALTER COLUMN preferences TYPE text
        USING CASE
            WHEN preferences IS NULL THEN NULL
            ELSE preferences::text
        END
    """)

    # Phase 1 — reverse
    op.drop_constraint("impersonation_actions_session_id_fkey", "impersonation_actions", type_="foreignkey")

    op.drop_constraint("webhooks_user_id_fkey", "webhooks", type_="foreignkey")
    op.create_foreign_key("webhooks_user_id_fkey", "webhooks", "users", ["user_id"], ["id"])

    op.drop_constraint("notification_rules_created_by_id_fkey", "notification_rules", type_="foreignkey")
    op.create_foreign_key("notification_rules_created_by_id_fkey", "notification_rules", "users", ["created_by_id"], ["id"])
    op.alter_column("notification_rules", "created_by_id", nullable=False)

    op.drop_constraint("notifications_user_id_fkey", "notifications", type_="foreignkey")
    op.create_foreign_key("notifications_user_id_fkey", "notifications", "users", ["user_id"], ["id"])

    op.drop_index("ix_events_resource_id", "events")
    op.drop_index("ix_events_actor_id", "events")
