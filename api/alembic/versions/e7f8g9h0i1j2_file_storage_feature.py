"""Add file_storage feature: storage_documents table, avatar_file_id on users, permissions.

Revision ID: e7f8g9h0i1j2
Revises: d6e7f8g9h0i1
Create Date: 2026-03-01
"""

from typing import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "e7f8g9h0i1j2"
down_revision: str | None = "d6e7f8g9h0i1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Create storage_documents table
    op.create_table(
        "storage_documents",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("uuid", sa.String(length=36), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("stored_filename", sa.String(length=255), nullable=False),
        sa.Column("mime_type", sa.String(length=100), nullable=False),
        sa.Column("extension", sa.String(length=20), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("storage_backend", sa.String(length=20), nullable=False, server_default="local"),
        sa.Column("storage_path", sa.String(length=500), nullable=False),
        sa.Column("uploaded_by", sa.Integer(), nullable=True),
        sa.Column("resource_type", sa.String(length=100), nullable=False, server_default="general"),
        sa.Column("resource_id", sa.Integer(), nullable=True),
        sa.Column("category", sa.String(length=50), nullable=False, server_default="document"),
        sa.Column("has_thumbnail", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("checksum_sha256", sa.String(length=64), nullable=True),
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("scan_status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("scan_result", sa.String(length=255), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["uploaded_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_storage_documents_uuid", "storage_documents", ["uuid"], unique=True)
    op.create_index("ix_storage_documents_uploaded_by", "storage_documents", ["uploaded_by"])
    op.create_index("ix_storage_documents_resource", "storage_documents", ["resource_type", "resource_id"])
    op.create_index("ix_storage_documents_owner_created", "storage_documents", ["uploaded_by", "created_at"])
    op.create_index("ix_storage_documents_category", "storage_documents", ["category"])

    # 2. Add avatar_file_id on users
    op.add_column("users", sa.Column("avatar_file_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_users_avatar_file_id",
        "users",
        "storage_documents",
        ["avatar_file_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # 3. Feature state
    op.execute(sa.text("""
        INSERT INTO feature_states (name, is_active, updated_at)
        VALUES ('file_storage', true, now())
        ON CONFLICT (name) DO NOTHING
    """))

    # 4. Global permissions (all authenticated users can upload/read/delete their own files)
    op.execute(sa.text("""
        INSERT INTO global_permissions (permission_id, granted)
        SELECT id, true FROM permissions WHERE code IN ('file_storage.upload', 'file_storage.read', 'file_storage.delete')
        ON CONFLICT (permission_id) DO NOTHING
    """))

    # 5. Admin role gets file_storage.admin
    op.execute(sa.text("""
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id
          FROM roles r
          CROSS JOIN permissions p
         WHERE r.slug = 'admin'
           AND p.code = 'file_storage.admin'
           AND NOT EXISTS (
               SELECT 1 FROM role_permissions rp
                WHERE rp.role_id = r.id AND rp.permission_id = p.id
           )
    """))


def downgrade() -> None:
    op.drop_constraint("fk_users_avatar_file_id", "users", type_="foreignkey")
    op.drop_column("users", "avatar_file_id")
    op.drop_index("ix_storage_documents_category", table_name="storage_documents")
    op.drop_index("ix_storage_documents_owner_created", table_name="storage_documents")
    op.drop_index("ix_storage_documents_resource", table_name="storage_documents")
    op.drop_index("ix_storage_documents_uploaded_by", table_name="storage_documents")
    op.drop_index("ix_storage_documents_uuid", table_name="storage_documents")
    op.drop_table("storage_documents")
    op.execute(sa.text("DELETE FROM feature_states WHERE name = 'file_storage'"))
