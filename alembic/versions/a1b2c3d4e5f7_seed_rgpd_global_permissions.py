"""seed rgpd.read as global permission for all users

Revision ID: a1b2c3d4e5f7
Revises: f7a8b9c0d1e2
Create Date: 2026-02-21 19:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f7'
down_revision: Union[str, None] = 'f7a8b9c0d1e2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Grant rgpd.read globally so all authenticated users can manage their consent,
    # view their data and exercise their RGPD rights.
    op.execute(
        sa.text("""
            INSERT INTO global_permissions (permission_id, granted)
            SELECT id, true FROM permissions WHERE code = 'rgpd.read'
            ON CONFLICT (permission_id) DO NOTHING
        """)
    )


def downgrade() -> None:
    op.execute(
        sa.text("""
            DELETE FROM global_permissions
            WHERE permission_id IN (SELECT id FROM permissions WHERE code = 'rgpd.read')
        """)
    )
