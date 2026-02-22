"""Add legal page acceptance system: requires_acceptance column, version history, acceptances table.

Revision ID: g8h9i0j1k2l3
Revises: a1b2c3d4e5f7
Create Date: 2026-02-22 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "g8h9i0j1k2l3"
down_revision: Union[str, None] = "a1b2c3d4e5f7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add requires_acceptance column to legal_pages
    op.add_column(
        "legal_pages",
        sa.Column("requires_acceptance", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )

    # 2. Create legal_page_versions table (content history)
    op.create_table(
        "legal_page_versions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("legal_page_id", sa.Integer(), sa.ForeignKey("legal_pages.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("content_html", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("legal_page_id", "version", name="uq_legal_page_versions_page_version"),
    )

    # 3. Create legal_page_acceptances table
    op.create_table(
        "legal_page_acceptances",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("legal_page_id", sa.Integer(), sa.ForeignKey("legal_pages.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version_accepted", sa.Integer(), nullable=False),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.String(500), nullable=True),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_legal_acceptances_user_page",
        "legal_page_acceptances",
        ["user_id", "legal_page_id"],
    )

    # 4. Seed: mark terms and privacy-policy as requires_acceptance
    op.execute(
        sa.text("UPDATE legal_pages SET requires_acceptance = true WHERE slug IN ('terms', 'privacy-policy')")
    )


def downgrade() -> None:
    op.drop_table("legal_page_acceptances")
    op.drop_table("legal_page_versions")
    op.drop_column("legal_pages", "requires_acceptance")
