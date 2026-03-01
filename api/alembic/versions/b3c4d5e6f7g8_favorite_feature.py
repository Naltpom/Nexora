"""Add favorite feature: favorites table, seed feature_state + permissions.

Revision ID: b3c4d5e6f7g8
Revises: a7b8c9d0e1f2
Create Date: 2026-02-28
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b3c4d5e6f7g8"
down_revision: str | None = "a7b8c9d0e1f2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Create favorites table
    op.create_table(
        "favorites",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("label", sa.String(length=255), nullable=False),
        sa.Column("icon", sa.String(length=50), nullable=True),
        sa.Column("url", sa.String(length=2000), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_favorites_user_position", "favorites", ["user_id", "position"])

    # 2. Seed feature_state
    op.execute(
        sa.text("""
            INSERT INTO feature_states (name, is_active, updated_at)
            VALUES ('favorite', true, now())
            ON CONFLICT (name) DO NOTHING
        """)
    )

    # 3. Add favorite.read + favorite.manage as global permissions (all users manage their own favorites)
    for perm_code in ("favorite.read", "favorite.manage"):
        op.execute(
            sa.text("""
                INSERT INTO global_permissions (permission_id, granted)
                SELECT id, true FROM permissions WHERE code = :code
                ON CONFLICT (permission_id) DO NOTHING
            """).bindparams(code=perm_code)
        )


def downgrade() -> None:
    op.drop_index("ix_favorites_user_position", table_name="favorites")
    op.drop_table("favorites")
    op.execute(sa.text("DELETE FROM feature_states WHERE name = 'favorite'"))
    for perm_code in ("favorite.read", "favorite.manage"):
        op.execute(
            sa.text("""
                DELETE FROM global_permissions
                WHERE permission_id IN (SELECT id FROM permissions WHERE code = :code)
            """).bindparams(code=perm_code)
        )
