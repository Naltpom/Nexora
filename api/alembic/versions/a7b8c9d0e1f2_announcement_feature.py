"""Add announcement feature: announcements + announcement_dismissals tables, seed feature_state + permissions.

Revision ID: a7b8c9d0e1f2
Revises: 3ecaf7c326eb
Create Date: 2026-02-28
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a7b8c9d0e1f2"
down_revision: str | None = "3ecaf7c326eb"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Create announcements table
    op.create_table(
        "announcements",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("type", sa.String(length=20), nullable=False, server_default="info"),
        sa.Column("target_roles", sa.JSON(), nullable=True),
        sa.Column("start_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_dismissible", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("priority", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_by_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_announcements_active_dates", "announcements", ["is_active", "start_date", "end_date"])

    # 2. Create announcement_dismissals table
    op.create_table(
        "announcement_dismissals",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("announcement_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("dismissed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["announcement_id"], ["announcements.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "announcement_id", name="uq_dismissal_user_announcement"),
    )

    # 3. Seed feature_state
    op.execute(
        sa.text("""
            INSERT INTO feature_states (name, is_active, updated_at)
            VALUES ('announcement', true, now())
            ON CONFLICT (name) DO NOTHING
        """)
    )

    # 4. Add announcement.read as global permission (all authenticated users)
    op.execute(
        sa.text("""
            INSERT INTO global_permissions (permission_id, granted)
            SELECT id, true FROM permissions WHERE code = 'announcement.read'
            ON CONFLICT (permission_id) DO NOTHING
        """)
    )

    # 5. Add announcement.manage to admin role
    op.execute(
        sa.text("""
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT r.id, p.id
              FROM roles r
              CROSS JOIN permissions p
             WHERE r.slug = 'admin'
               AND p.code = 'announcement.manage'
               AND NOT EXISTS (
                   SELECT 1 FROM role_permissions rp
                    WHERE rp.role_id = r.id AND rp.permission_id = p.id
               )
        """)
    )


def downgrade() -> None:
    op.drop_table("announcement_dismissals")
    op.drop_index("ix_announcements_active_dates", table_name="announcements")
    op.drop_table("announcements")
    op.execute(sa.text("DELETE FROM feature_states WHERE name = 'announcement'"))
    op.execute(
        sa.text("""
            DELETE FROM global_permissions
            WHERE permission_id IN (SELECT id FROM permissions WHERE code = 'announcement.read')
        """)
    )
