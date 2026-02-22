"""Sync notification.push feature_state from PUSH_ENABLED env var.

The bootstrap migration hardcoded notification.push=false.
This migration corrects it to match the PUSH_ENABLED env var.

Revision ID: k4l5m6n7o8p9
Revises: j3k4l5m6n7o8
Create Date: 2026-02-22
"""

import os
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "k4l5m6n7o8p9"
down_revision: Union[str, None] = "j3k4l5m6n7o8"
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    is_active = os.environ.get("PUSH_ENABLED", "false").lower() == "true"
    op.execute(
        sa.text(
            "UPDATE feature_states SET is_active = :active, updated_at = NOW() "
            "WHERE name = 'notification.push'"
        ).bindparams(active=is_active)
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            "UPDATE feature_states SET is_active = false, updated_at = NOW() "
            "WHERE name = 'notification.push'"
        )
    )
