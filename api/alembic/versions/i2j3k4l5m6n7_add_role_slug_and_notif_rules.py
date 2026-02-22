"""add_role_slug_and_notif_rules: add slug column to roles + seed default notification rules.

Revision ID: i2j3k4l5m6n7
Revises: h1i2j3k4l5m6
Create Date: 2026-02-22 22:00:00.000000

"""
import json
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "i2j3k4l5m6n7"
down_revision: Union[str, None] = "h1i2j3k4l5m6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# ── Notification rule fixtures (inlined to keep migration self-contained) ────

DEFAULT_NOTIFICATION_RULES = [
    {
        "name": "Nouveaux utilisateurs",
        "event_types": ["user.registered"],
        "target_type": "all",
        "channel_in_app": True, "channel_email": False,
        "channel_webhook": False, "channel_push": False,
        "default_in_app": True, "default_email": False,
        "default_webhook": False, "default_push": False,
        "is_active": True, "is_default_template": True,
    },
    {
        "name": "Modifications de profil",
        "event_types": ["user.updated"],
        "target_type": "all",
        "channel_in_app": True, "channel_email": False,
        "channel_webhook": False, "channel_push": False,
        "default_in_app": True, "default_email": False,
        "default_webhook": False, "default_push": False,
        "is_active": True, "is_default_template": True,
    },
    {
        "name": "Invitations",
        "event_types": ["user.invited"],
        "target_type": "all",
        "channel_in_app": True, "channel_email": True,
        "channel_webhook": False, "channel_push": False,
        "default_in_app": True, "default_email": True,
        "default_webhook": False, "default_push": False,
        "is_active": True, "is_default_template": True,
    },
    {
        "name": "D\u00e9sactivations de compte",
        "event_types": ["user.deactivated"],
        "target_type": "all",
        "channel_in_app": True, "channel_email": False,
        "channel_webhook": False, "channel_push": False,
        "default_in_app": True, "default_email": False,
        "default_webhook": False, "default_push": False,
        "is_active": True, "is_default_template": True,
    },
]


def upgrade() -> None:
    conn = op.get_bind()

    # ── 1. Add slug column (nullable first) ─────────────────────────────
    op.add_column("roles", sa.Column("slug", sa.String(100), nullable=True))

    # ── 2. Populate slug from current name values ───────────────────────
    conn.execute(sa.text("UPDATE roles SET slug = name"))

    # ── 3. Update name to display-friendly versions ─────────────────────
    conn.execute(sa.text("""
        UPDATE roles SET name = CASE slug
            WHEN 'super_admin' THEN 'Super Admin'
            WHEN 'admin' THEN 'Administrateur'
            WHEN 'user' THEN 'Utilisateur'
            ELSE name
        END
    """))

    # ── 4. Make slug NOT NULL + UNIQUE ──────────────────────────────────
    op.alter_column("roles", "slug", nullable=False)
    op.create_unique_constraint("uq_roles_slug", "roles", ["slug"])
    op.create_index("ix_roles_slug", "roles", ["slug"], unique=True)

    # ── 5. Seed default notification rules ──────────────────────────────
    for rule in DEFAULT_NOTIFICATION_RULES:
        conn.execute(
            sa.text("""
                INSERT INTO notification_rules
                    (name, event_types, target_type,
                     channel_in_app, channel_email, channel_webhook, channel_push,
                     default_in_app, default_email, default_webhook, default_push,
                     is_active, is_default_template, created_at, updated_at)
                VALUES
                    (:name, :event_types, :target_type,
                     :channel_in_app, :channel_email, :channel_webhook, :channel_push,
                     :default_in_app, :default_email, :default_webhook, :default_push,
                     :is_active, :is_default_template, NOW(), NOW())
                ON CONFLICT DO NOTHING
            """),
            {
                "name": rule["name"],
                "event_types": json.dumps(rule["event_types"]),
                "target_type": rule["target_type"],
                "channel_in_app": rule["channel_in_app"],
                "channel_email": rule["channel_email"],
                "channel_webhook": rule["channel_webhook"],
                "channel_push": rule["channel_push"],
                "default_in_app": rule["default_in_app"],
                "default_email": rule["default_email"],
                "default_webhook": rule["default_webhook"],
                "default_push": rule["default_push"],
                "is_active": rule["is_active"],
                "is_default_template": rule["is_default_template"],
            },
        )


def downgrade() -> None:
    conn = op.get_bind()

    # Remove notification rules
    rule_names = [r["name"] for r in DEFAULT_NOTIFICATION_RULES]
    names_literal = ", ".join(f"'{n}'" for n in rule_names)
    conn.execute(sa.text(
        f"DELETE FROM notification_rules WHERE name IN ({names_literal}) AND is_default_template = true"
    ))

    # Restore role name from slug
    conn.execute(sa.text("UPDATE roles SET name = slug"))

    # Drop slug column
    op.drop_index("ix_roles_slug", table_name="roles")
    op.drop_constraint("uq_roles_slug", "roles", type_="unique")
    op.drop_column("roles", "slug")
