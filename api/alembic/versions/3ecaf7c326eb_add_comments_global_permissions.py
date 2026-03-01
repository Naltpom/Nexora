"""add comments global permissions

Revision ID: 3ecaf7c326eb
Revises: af69746fdf9f
Create Date: 2026-02-28 17:07:34.581951

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3ecaf7c326eb'
down_revision: Union[str, None] = 'af69746fdf9f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


GLOBAL_PERMISSIONS = [
    "comments.read",
    "comments.create",
    "comments.update",
    "comments.delete",
]


def upgrade() -> None:
    for perm_code in GLOBAL_PERMISSIONS:
        op.execute(sa.text("""
            INSERT INTO global_permissions (permission_id, granted)
            SELECT id, true FROM permissions WHERE code = :code
            ON CONFLICT DO NOTHING;
        """).bindparams(code=perm_code))


def downgrade() -> None:
    for perm_code in GLOBAL_PERMISSIONS:
        op.execute(sa.text("""
            DELETE FROM global_permissions
            WHERE permission_id IN (SELECT id FROM permissions WHERE code = :code);
        """).bindparams(code=perm_code))
