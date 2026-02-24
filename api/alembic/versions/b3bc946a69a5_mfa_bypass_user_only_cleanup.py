"""mfa_bypass_user_only_cleanup

Remove mfa.bypass from all role_permissions and global_permissions.
This permission is now user-only (assigned directly per-user via user_permissions).

Revision ID: b3bc946a69a5
Revises: 79bf0b0e7150
Create Date: 2026-02-23 23:24:21.186889

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b3bc946a69a5'
down_revision: Union[str, None] = '79bf0b0e7150'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Remove mfa.bypass from all roles (it's now user-only)
    op.execute(sa.text("""
        DELETE FROM role_permissions
        WHERE permission_id IN (
            SELECT id FROM permissions WHERE code = 'mfa.bypass'
        )
    """))
    # Remove from global permissions (safety)
    op.execute(sa.text("""
        DELETE FROM global_permissions
        WHERE permission_id IN (
            SELECT id FROM permissions WHERE code = 'mfa.bypass'
        )
    """))


def downgrade() -> None:
    # Re-add mfa.bypass to DPO role
    op.execute(sa.text("""
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id FROM roles r, permissions p
        WHERE r.slug = 'dpo' AND p.code = 'mfa.bypass'
        ON CONFLICT DO NOTHING
    """))
