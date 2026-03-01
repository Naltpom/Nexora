"""announcement_modal_display

Revision ID: 74627f0da007
Revises: 1a853bd65f79
Create Date: 2026-02-28 23:11:25.326958

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '74627f0da007'
down_revision: Union[str, None] = '1a853bd65f79'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('announcements', sa.Column('display', sa.String(length=20), nullable=False, server_default='banner'))
    op.add_column('announcements', sa.Column('requires_acknowledgment', sa.Boolean(), nullable=False, server_default=sa.text('false')))


def downgrade() -> None:
    op.drop_column('announcements', 'requires_acknowledgment')
    op.drop_column('announcements', 'display')
