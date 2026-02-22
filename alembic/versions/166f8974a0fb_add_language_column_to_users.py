"""add language column to users

Revision ID: 166f8974a0fb
Revises: g8h9i0j1k2l3
Create Date: 2026-02-22 13:11:39.436922

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '166f8974a0fb'
down_revision: Union[str, None] = 'g8h9i0j1k2l3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('language', sa.String(length=10), nullable=False, server_default='fr'))


def downgrade() -> None:
    op.drop_column('users', 'language')
