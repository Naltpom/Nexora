"""Add color field to roles table.

Stores a hex color code (#RRGGBB) for role badge display.
Assigns default colors to built-in roles.

Revision ID: m6n7o8p9q0r1
Revises: l5m6n7o8p9q0
Create Date: 2026-02-23
"""

from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "m6n7o8p9q0r1"
down_revision: Union[str, None] = "l5m6n7o8p9q0"
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    op.add_column("roles", sa.Column("color", sa.String(length=7), nullable=True))

    # Assign default colors to built-in roles
    op.execute(sa.text("UPDATE roles SET color = '#EF4444' WHERE slug = 'super_admin'"))
    op.execute(sa.text("UPDATE roles SET color = '#3B82F6' WHERE slug = 'admin'"))
    op.execute(sa.text("UPDATE roles SET color = '#22C55E' WHERE slug = 'user'"))


def downgrade() -> None:
    op.drop_column("roles", "color")
