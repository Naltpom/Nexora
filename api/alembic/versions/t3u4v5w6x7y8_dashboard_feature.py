"""Dashboard feature: table + seeds.

Revision ID: t3u4v5w6x7y8
Revises: g0h1i2j3k4l5
Create Date: 2026-03-01
"""

from typing import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "t3u4v5w6x7y8"
down_revision: str | None = "g0h1i2j3k4l5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Create dashboard_layouts table
    op.create_table(
        "dashboard_layouts",
        sa.Column("id", sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True),
        sa.Column("role_slug", sa.String(100), nullable=True),
        sa.Column("is_default", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("widgets", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index(
        "ix_dashboard_layouts_user_id",
        "dashboard_layouts",
        ["user_id"],
        unique=True,
        postgresql_where=sa.text("user_id IS NOT NULL"),
    )
    op.create_index(
        "ix_dashboard_layouts_role_slug",
        "dashboard_layouts",
        ["role_slug"],
        postgresql_where=sa.text("role_slug IS NOT NULL"),
    )

    # Seed feature_state
    op.execute(
        sa.text(
            "INSERT INTO feature_states (name, is_active, updated_at) "
            "VALUES ('dashboard', true, now()) "
            "ON CONFLICT (name) DO NOTHING"
        )
    )

    # Seed dashboard.read as GlobalPermission
    op.execute(
        sa.text(
            "INSERT INTO permissions (code, feature, label, description) "
            "VALUES ('dashboard.read', 'dashboard', 'Dashboard Read', 'Consulter le tableau de bord') "
            "ON CONFLICT (code) DO NOTHING"
        )
    )
    op.execute(
        sa.text(
            "INSERT INTO permissions (code, feature, label, description) "
            "VALUES ('dashboard.manage', 'dashboard', 'Dashboard Manage', 'Gerer les layouts du tableau de bord') "
            "ON CONFLICT (code) DO NOTHING"
        )
    )
    op.execute(
        sa.text(
            "INSERT INTO global_permissions (permission_id, granted) "
            "SELECT id, true FROM permissions WHERE code = 'dashboard.read' "
            "ON CONFLICT (permission_id) DO NOTHING"
        )
    )

    # Assign dashboard.manage to admin role
    op.execute(
        sa.text(
            "INSERT INTO role_permissions (role_id, permission_id) "
            "SELECT r.id, p.id FROM roles r, permissions p "
            "WHERE r.slug = 'admin' AND p.code = 'dashboard.manage' "
            "ON CONFLICT DO NOTHING"
        )
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            "DELETE FROM role_permissions WHERE permission_id IN "
            "(SELECT id FROM permissions WHERE code IN ('dashboard.read', 'dashboard.manage'))"
        )
    )
    op.execute(
        sa.text(
            "DELETE FROM global_permissions WHERE permission_id IN "
            "(SELECT id FROM permissions WHERE code = 'dashboard.read')"
        )
    )
    op.execute(sa.text("DELETE FROM permissions WHERE code IN ('dashboard.read', 'dashboard.manage')"))
    op.execute(sa.text("DELETE FROM feature_states WHERE name = 'dashboard'"))
    op.drop_index("ix_dashboard_layouts_role_slug", table_name="dashboard_layouts")
    op.drop_index("ix_dashboard_layouts_user_id", table_name="dashboard_layouts")
    op.drop_table("dashboard_layouts")
