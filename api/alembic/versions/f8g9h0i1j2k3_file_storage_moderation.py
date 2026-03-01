"""Add file_storage moderation: file_storage_policies table, status/moderation columns on storage_documents.

Revision ID: f8g9h0i1j2k3
Revises: e7f8g9h0i1j2
Create Date: 2026-03-01
"""

from typing import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "f8g9h0i1j2k3"
down_revision: str | None = "e7f8g9h0i1j2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # -- file_storage_policies table --
    op.create_table(
        "file_storage_policies",
        sa.Column("resource_type", sa.String(100), primary_key=True),
        sa.Column("requires_moderation", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
    )

    # -- Moderation columns on storage_documents --
    op.add_column(
        "storage_documents",
        sa.Column("status", sa.String(20), nullable=False, server_default="approved"),
    )
    op.add_column(
        "storage_documents",
        sa.Column("moderated_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
    )
    op.add_column(
        "storage_documents",
        sa.Column("moderated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_storage_documents_status_created",
        "storage_documents",
        ["status", "created_at"],
    )

    # -- Assign file_storage.moderate and file_storage.policies to admin role --
    op.execute(
        sa.text("""
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT r.id, p.id
            FROM roles r, permissions p
            WHERE r.slug = 'admin'
              AND p.code IN ('file_storage.moderate', 'file_storage.policies')
              AND NOT EXISTS (
                  SELECT 1 FROM role_permissions rp
                  WHERE rp.role_id = r.id AND rp.permission_id = p.id
              )
        """)
    )


def downgrade() -> None:
    op.execute(
        sa.text("""
            DELETE FROM role_permissions
            WHERE permission_id IN (
                SELECT id FROM permissions WHERE code IN ('file_storage.moderate', 'file_storage.policies')
            )
        """)
    )
    op.drop_index("ix_storage_documents_status_created", table_name="storage_documents")
    op.drop_column("storage_documents", "moderated_at")
    op.drop_column("storage_documents", "moderated_by_id")
    op.drop_column("storage_documents", "status")
    op.drop_table("file_storage_policies")
