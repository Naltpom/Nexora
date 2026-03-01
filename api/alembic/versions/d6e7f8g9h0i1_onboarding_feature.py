"""Add onboarding feature: seed feature_state + global permission + mark existing users.

Revision ID: d6e7f8g9h0i1
Revises: c5d6e7f8g9h0
Create Date: 2026-03-01
"""

from typing import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "d6e7f8g9h0i1"
down_revision: str | None = "c5d6e7f8g9h0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Seed feature_state (active by default)
    op.execute(
        sa.text("""
            INSERT INTO feature_states (name, is_active, updated_at)
            VALUES ('onboarding', true, now())
            ON CONFLICT (name) DO NOTHING
        """)
    )

    # 2. Add onboarding.read as global permission (all authenticated users)
    # Permission is pre-inserted by bootstrap fixture (h1i2j3k4l5m6)
    op.execute(
        sa.text("""
            INSERT INTO global_permissions (permission_id, granted)
            SELECT id, true FROM permissions WHERE code = 'onboarding.read'
            ON CONFLICT (permission_id) DO NOTHING
        """)
    )

    # 4. Mark existing users as onboarding completed (only users who have logged in before)
    op.execute(
        sa.text("""
            UPDATE users
            SET preferences = jsonb_set(
                COALESCE(preferences, '{}'),
                '{onboarding_completed}',
                'true'
            )
            WHERE last_login IS NOT NULL
        """)
    )


def downgrade() -> None:
    # Remove onboarding_completed from all user preferences
    op.execute(
        sa.text("""
            UPDATE users
            SET preferences = preferences - 'onboarding_completed'
            WHERE preferences ? 'onboarding_completed'
        """)
    )

    op.execute(
        sa.text("""
            DELETE FROM global_permissions
            WHERE permission_id IN (SELECT id FROM permissions WHERE code = 'onboarding.read')
        """)
    )

    op.execute(sa.text("DELETE FROM feature_states WHERE name = 'onboarding'"))
