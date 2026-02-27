"""Add lifecycle feature: archived_at column on users, lifecycle_emails table, seed feature_state.

Revision ID: r1s2t3u4v5w6
Revises: q0r1s2t3u4v5
Create Date: 2026-02-27
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "r1s2t3u4v5w6"
down_revision: str | None = "q0r1s2t3u4v5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Add archived_at column to users
    op.add_column("users", sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True))

    # 2. Create lifecycle_emails table
    op.create_table(
        "lifecycle_emails",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("email_type", sa.String(length=50), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "email_type", name="uq_lifecycle_emails_user_type"),
    )
    op.create_index("ix_lifecycle_emails_user_id", "lifecycle_emails", ["user_id"])

    # 3. Seed feature_state
    op.execute(
        sa.text("""
            INSERT INTO feature_states (name, is_active, updated_at)
            VALUES ('lifecycle', true, now())
            ON CONFLICT (name) DO NOTHING
        """)
    )

    # 4. Add lifecycle permissions to admin role
    op.execute(
        sa.text("""
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT r.id, p.id
              FROM roles r
              CROSS JOIN permissions p
             WHERE r.slug = 'admin'
               AND p.code IN ('lifecycle.read', 'lifecycle.manage')
               AND NOT EXISTS (
                   SELECT 1 FROM role_permissions rp
                    WHERE rp.role_id = r.id AND rp.permission_id = p.id
               )
        """)
    )


def downgrade() -> None:
    op.drop_index("ix_lifecycle_emails_user_id", table_name="lifecycle_emails")
    op.drop_table("lifecycle_emails")
    op.drop_column("users", "archived_at")
    op.execute(sa.text("DELETE FROM feature_states WHERE name = 'lifecycle'"))
