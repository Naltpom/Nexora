"""Drop unique constraint on roles.name (name is display-only, slug is the technical key).

Revision ID: j3k4l5m6n7o8
Revises: i2j3k4l5m6n7
Create Date: 2026-02-22
"""
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "j3k4l5m6n7o8"
down_revision: Union[str, None] = "i2j3k4l5m6n7"
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    # The initial migration created an unnamed UniqueConstraint('name') on roles.
    # PostgreSQL auto-names it "roles_name_key".
    op.drop_constraint("roles_name_key", "roles", type_="unique")


def downgrade() -> None:
    op.create_unique_constraint("roles_name_key", "roles", ["name"])
