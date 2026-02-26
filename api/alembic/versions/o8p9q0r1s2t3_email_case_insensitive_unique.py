"""email_case_insensitive_unique

Revision ID: o8p9q0r1s2t3
Revises: c4d5e6f7a8b9
Create Date: 2026-02-26 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "o8p9q0r1s2t3"
down_revision: str = "c4d5e6f7a8b9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Normalize existing emails to lowercase
    op.execute(sa.text("UPDATE users SET email = LOWER(email) WHERE email != LOWER(email)"))
    op.execute(sa.text("UPDATE invitations SET email = LOWER(email) WHERE email != LOWER(email)"))

    # 2. Drop old case-sensitive unique index
    op.drop_index("ix_users_email", table_name="users")

    # 3. Create case-insensitive unique index
    op.execute(sa.text(
        "CREATE UNIQUE INDEX ix_users_email ON users (LOWER(email))"
    ))


def downgrade() -> None:
    op.drop_index("ix_users_email", table_name="users")
    op.create_index("ix_users_email", "users", ["email"], unique=True)
