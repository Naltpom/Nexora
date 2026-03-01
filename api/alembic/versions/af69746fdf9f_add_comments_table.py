"""add comments table

Revision ID: af69746fdf9f
Revises: s2t3u4v5w6x7
Create Date: 2026-02-28 17:07:07.274414

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'af69746fdf9f'
down_revision: Union[str, None] = 's2t3u4v5w6x7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('comments',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('resource_type', sa.String(length=100), nullable=False),
    sa.Column('resource_id', sa.Integer(), nullable=False),
    sa.Column('content', sa.Text(), nullable=False),
    sa.Column('parent_id', sa.Integer(), nullable=True),
    sa.Column('is_edited', sa.Boolean(), nullable=False),
    sa.Column('edited_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['parent_id'], ['comments.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_comments_created_at', 'comments', ['created_at'], unique=False)
    op.create_index('ix_comments_parent', 'comments', ['parent_id'], unique=False)
    op.create_index('ix_comments_resource', 'comments', ['resource_type', 'resource_id'], unique=False)
    op.create_index('ix_comments_user_created', 'comments', ['user_id', 'created_at'], unique=False)
    op.create_index(op.f('ix_comments_user_id'), 'comments', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_comments_user_id'), table_name='comments')
    op.drop_index('ix_comments_user_created', table_name='comments')
    op.drop_index('ix_comments_resource', table_name='comments')
    op.drop_index('ix_comments_parent', table_name='comments')
    op.drop_index('ix_comments_created_at', table_name='comments')
    op.drop_table('comments')
