"""add_permission_assignment_rules

Add assignment_rules JSONB column to permissions table.
Controls where a permission can be assigned: user, role, global.
Default: all true. Only exceptions (like mfa.bypass) are configured.

Revision ID: c4d5e6f7a8b9
Revises: b3bc946a69a5
Create Date: 2026-02-24 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers, used by Alembic.
revision: str = 'c4d5e6f7a8b9'
down_revision: Union[str, None] = 'b3bc946a69a5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEFAULT_RULES = '{"user": true, "role": true, "global": true}'


def upgrade() -> None:
    op.add_column(
        'permissions',
        sa.Column(
            'assignment_rules',
            JSONB,
            server_default=DEFAULT_RULES,
            nullable=False,
        ),
    )
    # Seed mfa.bypass as user-only
    op.execute(sa.text("""
        UPDATE permissions
        SET assignment_rules = '{"user": true, "role": false, "global": false}'
        WHERE code = 'mfa.bypass'
    """))


def downgrade() -> None:
    op.drop_column('permissions', 'assignment_rules')
