"""add_uuid_to_users

Revision ID: 11353c6cc0cb
Revises: 3d0d9985f730
Create Date: 2026-02-20 17:04:01.259188

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "11353c6cc0cb"
down_revision: Union[str, None] = "3d0d9985f730"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add column as nullable first
    op.add_column("users", sa.Column("uuid", sa.UUID(), nullable=True))
    # 2. Populate existing rows with random UUIDs
    op.execute("UPDATE users SET uuid = gen_random_uuid() WHERE uuid IS NULL")
    # 3. Make it non-null
    op.alter_column("users", "uuid", nullable=False)
    # 4. Create unique index
    op.create_index(op.f("ix_users_uuid"), "users", ["uuid"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_users_uuid"), table_name="users")
    op.drop_column("users", "uuid")
