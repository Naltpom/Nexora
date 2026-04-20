"""sync model/schema drift

Catch-up migration for drift between ORM models and existing migrations:
- Creates export_history table (model exists, migration was missing)
- Adds dashboard_layouts.full_width (used by dashboard feature)
- Adds notifications.required_permission (+ index)
- Drops uq_sso_user_provider unique constraint (replaced by partial index)
- Adds users.can_login (unblocks startup admin promote query)

Each operation is idempotent via alembic.helpers: if a project has already
applied part of the drift manually (e.g. added can_login by hand), the
migration inspects the live schema and skips what is already there. Safe
to run on any DB state <= revision u4v5w6x7y8z9.

Revision ID: 74aa82f2daf9
Revises: u4v5w6x7y8z9
Create Date: 2026-04-20 08:25:31.859099

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from src.core.alembic_helpers import has_column, has_index, has_table, has_unique_constraint


# revision identifiers, used by Alembic.
revision: str = '74aa82f2daf9'
down_revision: Union[str, None] = 'u4v5w6x7y8z9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── export_history table ────────────────────────────────────────────
    if not has_table("export_history"):
        op.create_table(
            "export_history",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("uuid", sa.String(length=36), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=True),
            sa.Column("export_id", sa.String(length=100), nullable=False),
            sa.Column("export_label", sa.String(length=255), nullable=False),
            sa.Column("feature_name", sa.String(length=100), nullable=False),
            sa.Column("format", sa.String(length=20), nullable=False),
            sa.Column("params_json", sa.Text(), nullable=True),
            sa.Column("params_display", sa.Text(), nullable=True),
            sa.Column("oc_id", sa.Integer(), nullable=True),
            sa.Column("oc_name", sa.String(length=255), nullable=True),
            sa.Column("storage_document_id", sa.Integer(), nullable=True),
            sa.Column("file_size_bytes", sa.BigInteger(), nullable=True),
            sa.Column("status", sa.String(length=20), nullable=False),
            sa.Column("error_detail", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["storage_document_id"], ["storage_documents.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )

    for idx_name, cols, unique in [
        ("ix_export_history_export_id", ["export_id"], False),
        ("ix_export_history_feature_name", ["feature_name"], False),
        ("ix_export_history_user_created", ["user_id", "created_at"], False),
        ("ix_export_history_user_id", ["user_id"], False),
        ("ix_export_history_uuid", ["uuid"], True),
    ]:
        if not has_index("export_history", idx_name):
            op.create_index(idx_name, "export_history", cols, unique=unique)

    # ── dashboard_layouts.full_width ────────────────────────────────────
    if not has_column("dashboard_layouts", "full_width"):
        op.add_column(
            "dashboard_layouts",
            sa.Column("full_width", sa.Boolean(), server_default="false", nullable=False),
        )

    # ── notifications.required_permission + index ──────────────────────
    if not has_column("notifications", "required_permission"):
        op.add_column(
            "notifications",
            sa.Column("required_permission", sa.String(length=100), nullable=True),
        )
    if not has_index("notifications", "ix_notifications_required_permission"):
        op.create_index(
            "ix_notifications_required_permission",
            "notifications",
            ["required_permission"],
            unique=False,
        )

    # ── drop uq_sso_user_provider (only if it still exists) ────────────
    if has_unique_constraint("sso_accounts", "uq_sso_user_provider"):
        op.drop_constraint("uq_sso_user_provider", "sso_accounts", type_="unique")

    # ── users.can_login ────────────────────────────────────────────────
    if not has_column("users", "can_login"):
        op.add_column(
            "users",
            sa.Column("can_login", sa.Boolean(), server_default="true", nullable=False),
        )


def downgrade() -> None:
    if has_column("users", "can_login"):
        op.drop_column("users", "can_login")

    if not has_unique_constraint("sso_accounts", "uq_sso_user_provider"):
        op.create_unique_constraint(
            "uq_sso_user_provider",
            "sso_accounts",
            ["user_id", "provider"],
            postgresql_nulls_not_distinct=False,
        )

    if has_index("notifications", "ix_notifications_required_permission"):
        op.drop_index("ix_notifications_required_permission", table_name="notifications")
    if has_column("notifications", "required_permission"):
        op.drop_column("notifications", "required_permission")

    if has_column("dashboard_layouts", "full_width"):
        op.drop_column("dashboard_layouts", "full_width")

    for idx_name in [
        "ix_export_history_uuid",
        "ix_export_history_user_id",
        "ix_export_history_user_created",
        "ix_export_history_feature_name",
        "ix_export_history_export_id",
    ]:
        if has_index("export_history", idx_name):
            op.drop_index(idx_name, table_name="export_history")

    if has_table("export_history"):
        op.drop_table("export_history")
