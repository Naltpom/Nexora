"""security_tokens table + drop old columns + event FK cascade

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-02-21 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create security_tokens table
    op.create_table('security_tokens',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('uuid', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('token_type', sa.String(length=30), nullable=False),
        sa.Column('token_hash', sa.String(length=255), nullable=False),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('uuid'),
    )
    op.create_index(op.f('ix_security_tokens_uuid'), 'security_tokens', ['uuid'], unique=True)
    op.create_index('ix_security_tokens_user_type', 'security_tokens', ['user_id', 'token_type'], unique=False)
    op.create_index('ix_security_tokens_type_expires', 'security_tokens', ['token_type', 'expires_at'], unique=False)
    op.create_index('ix_security_tokens_hash_type', 'security_tokens', ['token_hash', 'token_type'], unique=False)

    # 2. Drop old columns from users
    op.drop_column('users', 'password_reset_token')
    op.drop_column('users', 'password_reset_expires')
    op.drop_column('users', 'verification_code_hash')
    op.drop_column('users', 'verification_code_expires')
    op.drop_column('users', 'verification_code_sent_at')

    # 3. Drop old columns from invitations
    op.drop_column('invitations', 'verification_code_hash')
    op.drop_column('invitations', 'code_expires_at')
    op.drop_column('invitations', 'code_sent_at')

    # 4. Alter notifications.event_id FK to add ondelete CASCADE
    op.drop_constraint('notifications_event_id_fkey', 'notifications', type_='foreignkey')
    op.create_foreign_key(
        'notifications_event_id_fkey',
        'notifications', 'events',
        ['event_id'], ['id'],
        ondelete='CASCADE',
    )


def downgrade() -> None:
    # 4. Revert notifications.event_id FK
    op.drop_constraint('notifications_event_id_fkey', 'notifications', type_='foreignkey')
    op.create_foreign_key(
        'notifications_event_id_fkey',
        'notifications', 'events',
        ['event_id'], ['id'],
    )

    # 3. Restore invitations columns
    op.add_column('invitations', sa.Column('code_sent_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('invitations', sa.Column('code_expires_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('invitations', sa.Column('verification_code_hash', sa.String(length=255), nullable=True))

    # 2. Restore users columns
    op.add_column('users', sa.Column('verification_code_sent_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('verification_code_expires', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('verification_code_hash', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('password_reset_expires', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('password_reset_token', sa.String(length=255), nullable=True))

    # 1. Drop security_tokens table
    op.drop_index('ix_security_tokens_hash_type', table_name='security_tokens')
    op.drop_index('ix_security_tokens_type_expires', table_name='security_tokens')
    op.drop_index('ix_security_tokens_user_type', table_name='security_tokens')
    op.drop_index(op.f('ix_security_tokens_uuid'), table_name='security_tokens')
    op.drop_table('security_tokens')
