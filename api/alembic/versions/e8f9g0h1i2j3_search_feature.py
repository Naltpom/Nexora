"""Add search feature: seed feature_state + search.global global permission + search.reindex to admin role.

Revision ID: e8f9g0h1i2j3
Revises: f8g9h0i1j2k3
Create Date: 2026-03-01
"""

from typing import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "e8f9g0h1i2j3"
down_revision: str | None = "f8g9h0i1j2k3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Feature state (always active, is_core)
    op.execute(
        sa.text("""
            INSERT INTO feature_states (name, is_active, updated_at)
            VALUES ('search', true, now())
            ON CONFLICT (name) DO NOTHING
        """)
    )

    # 2. search.global as GlobalPermission (all authenticated users can search)
    op.execute(
        sa.text("""
            INSERT INTO global_permissions (permission_id, granted)
            SELECT p.id, true
            FROM permissions p
            WHERE p.code = 'search.global'
            ON CONFLICT DO NOTHING
        """)
    )

    # 3. Assign search.reindex to admin role
    op.execute(
        sa.text("""
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT r.id, p.id
            FROM roles r, permissions p
            WHERE r.slug = 'admin' AND p.code = 'search.reindex'
            ON CONFLICT DO NOTHING
        """)
    )


def downgrade() -> None:
    op.execute(
        sa.text("""
            DELETE FROM global_permissions
            WHERE permission_id IN (SELECT id FROM permissions WHERE code = 'search.global')
        """)
    )
    op.execute(
        sa.text("""
            DELETE FROM role_permissions
            WHERE permission_id IN (SELECT id FROM permissions WHERE code = 'search.reindex')
        """)
    )
    op.execute(sa.text("DELETE FROM feature_states WHERE name = 'search'"))
