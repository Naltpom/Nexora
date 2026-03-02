"""Add maintenance_mode feature: table, feature_state, permissions, global permission.

Revision ID: g0h1i2j3k4l5
Revises: f9g0h1i2j3k4
Create Date: 2026-03-01
"""

from typing import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "g0h1i2j3k4l5"
down_revision: str | None = "f9g0h1i2j3k4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Create maintenance_windows table
    op.create_table(
        "maintenance_windows",
        sa.Column("id", sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("scheduled_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("scheduled_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "bypass_roles",
            sa.dialects.postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'[\"super_admin\", \"admin\"]'::jsonb"),
        ),
        sa.Column(
            "created_by_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    # 2. Feature state
    op.execute(
        sa.text("""
            INSERT INTO feature_states (name, is_active, updated_at)
            VALUES ('maintenance_mode', true, now())
            ON CONFLICT (name) DO NOTHING
        """)
    )

    # 3. maintenance_mode.read as GlobalPermission (all authenticated users)
    op.execute(
        sa.text("""
            INSERT INTO global_permissions (permission_id, granted)
            SELECT p.id, true
            FROM permissions p
            WHERE p.code = 'maintenance_mode.read'
            ON CONFLICT DO NOTHING
        """)
    )

    # 4. Assign maintenance_mode.manage to admin role
    op.execute(
        sa.text("""
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT r.id, p.id
            FROM roles r, permissions p
            WHERE r.slug = 'admin' AND p.code = 'maintenance_mode.manage'
            ON CONFLICT DO NOTHING
        """)
    )


def downgrade() -> None:
    op.execute(
        sa.text("""
            DELETE FROM global_permissions
            WHERE permission_id IN (SELECT id FROM permissions WHERE code = 'maintenance_mode.read')
        """)
    )
    op.execute(
        sa.text("""
            DELETE FROM role_permissions
            WHERE permission_id IN (SELECT id FROM permissions WHERE code = 'maintenance_mode.manage')
        """)
    )
    op.execute(sa.text("DELETE FROM feature_states WHERE name = 'maintenance_mode'"))
    op.drop_table("maintenance_windows")
