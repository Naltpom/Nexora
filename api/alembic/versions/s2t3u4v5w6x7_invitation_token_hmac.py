"""Add token_hmac column to invitations for O(1) lookup.

Revision ID: s2t3u4v5w6x7
Revises: q0r1s2t3u4v5
Create Date: 2026-02-27
"""

from typing import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "s2t3u4v5w6x7"
down_revision: str | None = "r1s2t3u4v5w6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("invitations", sa.Column("token_hmac", sa.String(64), nullable=True))
    op.create_index("ix_invitations_token_hmac", "invitations", ["token_hmac"])


def downgrade() -> None:
    op.drop_index("ix_invitations_token_hmac", table_name="invitations")
    op.drop_column("invitations", "token_hmac")
