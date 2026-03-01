"""add comments moderation + comment_policies

Revision ID: 1a853bd65f79
Revises: b3c4d5e6f7g8
Create Date: 2026-02-28 22:11:06.221586

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1a853bd65f79'
down_revision: Union[str, None] = 'b3c4d5e6f7g8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('comment_policies',
    sa.Column('resource_type', sa.String(length=100), nullable=False),
    sa.Column('requires_moderation', sa.Boolean(), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_by_id', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('resource_type')
    )
    op.add_column('comments', sa.Column('status', sa.String(length=20), server_default='approved', nullable=False))
    op.add_column('comments', sa.Column('moderated_by_id', sa.Integer(), nullable=True))
    op.add_column('comments', sa.Column('moderated_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index('ix_comments_status_created', 'comments', ['status', 'created_at'], unique=False)
    op.create_foreign_key(None, 'comments', 'users', ['moderated_by_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint(None, 'comments', type_='foreignkey')
    op.drop_index('ix_comments_status_created', table_name='comments')
    op.drop_column('comments', 'moderated_at')
    op.drop_column('comments', 'moderated_by_id')
    op.drop_column('comments', 'status')
    op.drop_table('comment_policies')
