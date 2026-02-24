"""fix_mfa_allowed_methods_check_constraint

Revision ID: 79bf0b0e7150
Revises: 4697edebaaa0
Create Date: 2026-02-23 23:08:16.364919

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '79bf0b0e7150'
down_revision: Union[str, None] = '4697edebaaa0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Fix CHECK constraint: accept SQL NULL, JSONB null, or JSONB array.
    # SQLAlchemy JSONB serializes Python None as JSONB 'null' (not SQL NULL),
    # so the constraint must accept both forms.
    op.execute("""
        ALTER TABLE mfa_role_policies
        DROP CONSTRAINT IF EXISTS check_allowed_methods_is_array
    """)
    op.execute("""
        ALTER TABLE mfa_role_policies
        ADD CONSTRAINT check_allowed_methods_is_array
        CHECK (
            allowed_methods IS NULL
            OR jsonb_typeof(allowed_methods) = 'null'
            OR jsonb_typeof(allowed_methods) = 'array'
        )
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE mfa_role_policies
        DROP CONSTRAINT IF EXISTS check_allowed_methods_is_array
    """)
    op.execute("""
        ALTER TABLE mfa_role_policies
        ADD CONSTRAINT check_allowed_methods_is_array
        CHECK (allowed_methods IS NULL OR jsonb_typeof(allowed_methods) = 'array')
    """)
