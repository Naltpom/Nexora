"""Fix announcement schema: JSON->JSONB for target_roles, UniqueConstraint->unique Index on dismissals.

Revision ID: c5d6e7f8g9h0
Revises: 74627f0da007
Create Date: 2026-03-01
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB


revision: str = "c5d6e7f8g9h0"
down_revision: str | None = "74627f0da007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Change target_roles from JSON to JSONB
    op.alter_column(
        "announcements",
        "target_roles",
        type_=JSONB(),
        existing_type=sa.JSON(),
        existing_nullable=True,
    )

    # 2. Replace UniqueConstraint with unique Index on announcement_dismissals
    op.drop_constraint(
        "uq_dismissal_user_announcement",
        "announcement_dismissals",
        type_="unique",
    )
    op.create_index(
        "ix_announcement_dismissals_user_announcement",
        "announcement_dismissals",
        ["user_id", "announcement_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_announcement_dismissals_user_announcement",
        table_name="announcement_dismissals",
    )
    op.create_unique_constraint(
        "uq_dismissal_user_announcement",
        "announcement_dismissals",
        ["user_id", "announcement_id"],
    )
    op.alter_column(
        "announcements",
        "target_roles",
        type_=sa.JSON(),
        existing_type=JSONB(),
        existing_nullable=True,
    )
