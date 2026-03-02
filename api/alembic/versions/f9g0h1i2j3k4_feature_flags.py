"""Add feature_flags table, seed permissions to admin role.

Revision ID: f9g0h1i2j3k4
Revises: e8f9g0h1i2j3
Create Date: 2026-03-01
"""

from typing import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "f9g0h1i2j3k4"
down_revision: str | None = "e8f9g0h1i2j3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Create feature_flags table
    op.create_table(
        "feature_flags",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("feature_name", sa.String(length=100), nullable=False),
        sa.Column("strategy", sa.String(length=20), nullable=False, server_default="boolean"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("rollout_percentage", sa.Integer(), nullable=False, server_default=sa.text("100")),
        sa.Column("target_roles", JSONB(), nullable=True),
        sa.Column("target_users", JSONB(), nullable=True),
        sa.Column("variants", JSONB(), nullable=True),
        sa.Column("is_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_by_id", sa.Integer(), nullable=True),
        sa.Column("updated_by_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["feature_name"], ["feature_states.name"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["updated_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_feature_flags_feature_name", "feature_flags", ["feature_name"], unique=True)

    # 2. Add feature_flags.read and feature_flags.manage to admin role
    op.execute(
        sa.text("""
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT r.id, p.id
              FROM roles r
              CROSS JOIN permissions p
             WHERE r.slug = 'admin'
               AND p.code IN ('feature_flags.read', 'feature_flags.manage')
               AND NOT EXISTS (
                   SELECT 1 FROM role_permissions rp
                    WHERE rp.role_id = r.id AND rp.permission_id = p.id
               )
        """)
    )


def downgrade() -> None:
    op.drop_index("ix_feature_flags_feature_name", table_name="feature_flags")
    op.drop_table("feature_flags")
    op.execute(
        sa.text("""
            DELETE FROM role_permissions
            WHERE permission_id IN (
                SELECT id FROM permissions WHERE code IN ('feature_flags.read', 'feature_flags.manage')
            )
            AND role_id IN (SELECT id FROM roles WHERE slug = 'admin')
        """)
    )
