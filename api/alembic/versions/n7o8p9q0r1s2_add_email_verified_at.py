"""add_email_verified_at

Revision ID: n7o8p9q0r1s2
Revises: 3cfb6294d09c
Create Date: 2026-02-23 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'n7o8p9q0r1s2'
down_revision: Union[str, None] = '3cfb6294d09c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('email_verified_at', sa.DateTime(timezone=True), nullable=True))

    # Backfill: existing verified users get created_at as verified_at
    op.execute(
        sa.text(
            "UPDATE users SET email_verified_at = created_at WHERE email_verified = true AND email_verified_at IS NULL"
        )
    )


def downgrade() -> None:
    op.drop_column('users', 'email_verified_at')
