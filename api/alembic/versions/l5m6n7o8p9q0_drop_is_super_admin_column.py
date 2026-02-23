"""Drop is_super_admin column from users table.

The is_super_admin flag has been fully replaced by RBAC permissions.
Super admin status is now determined solely by having the super_admin role.
Impersonation immunity is handled by the impersonation.immune permission.

Revision ID: l5m6n7o8p9q0
Revises: k4l5m6n7o8p9
Create Date: 2026-02-23
"""

from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "l5m6n7o8p9q0"
down_revision: Union[str, None] = "k4l5m6n7o8p9"
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    op.drop_column("users", "is_super_admin")


def downgrade() -> None:
    op.add_column(
        "users",
        sa.Column("is_super_admin", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
