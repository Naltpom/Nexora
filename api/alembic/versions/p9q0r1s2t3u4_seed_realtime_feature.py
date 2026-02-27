"""seed realtime.stream as global permission and feature_state

Revision ID: p9q0r1s2t3u4
Revises: o8p9q0r1s2t3
Create Date: 2026-02-27
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "p9q0r1s2t3u4"
down_revision: Union[str, None] = "o8p9q0r1s2t3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Insert realtime.stream permission
    op.execute(
        sa.text(
            "INSERT INTO permissions (code, feature) "
            "VALUES ('realtime.stream', 'realtime') "
            "ON CONFLICT (code) DO NOTHING"
        )
    )

    # 2. Grant realtime.stream globally (all authenticated users)
    op.execute(
        sa.text(
            "INSERT INTO global_permissions (permission_id, granted) "
            "SELECT id, true FROM permissions WHERE code = 'realtime.stream' "
            "ON CONFLICT (permission_id) DO NOTHING"
        )
    )

    # 3. Feature state: active by default
    op.execute(
        sa.text(
            "INSERT INTO feature_states (name, is_active, updated_at) "
            "VALUES ('realtime', true, NOW()) "
            "ON CONFLICT (name) DO NOTHING"
        )
    )


def downgrade() -> None:
    op.execute(sa.text("DELETE FROM feature_states WHERE name = 'realtime'"))
    op.execute(
        sa.text(
            "DELETE FROM global_permissions "
            "WHERE permission_id IN (SELECT id FROM permissions WHERE code = 'realtime.stream')"
        )
    )
    op.execute(sa.text("DELETE FROM permissions WHERE code = 'realtime.stream'"))
