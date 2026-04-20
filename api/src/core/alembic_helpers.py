"""Idempotency helpers for Alembic migrations.

Every migration in this project must guard each op with a live-schema
check so the same revision can be applied cleanly on any DB state,
including DBs where part of the drift was patched manually before the
migration shipped.

Convention: `if not has_X(...): op.create_X(...)` on upgrade,
`if has_X(...): op.drop_X(...)` on downgrade.

Example::

    from alembic import op
    import sqlalchemy as sa
    from src.core.alembic_helpers import has_column, has_table, has_index

    def upgrade() -> None:
        if not has_column("users", "can_login"):
            op.add_column(
                "users",
                sa.Column("can_login", sa.Boolean(), server_default="true", nullable=False),
            )

    def downgrade() -> None:
        if has_column("users", "can_login"):
            op.drop_column("users", "can_login")
"""
from alembic import op
import sqlalchemy as sa


def _inspector() -> sa.Inspector:
    """Return a fresh inspector bound to the current migration connection.

    A new instance per call avoids stale caches after DDL ops earlier in
    the same migration.
    """
    return sa.inspect(op.get_bind())


def has_table(name: str) -> bool:
    return name in _inspector().get_table_names()


def has_column(table: str, column: str) -> bool:
    if not has_table(table):
        return False
    return column in {c["name"] for c in _inspector().get_columns(table)}


def has_index(table: str, index: str) -> bool:
    if not has_table(table):
        return False
    return index in {i["name"] for i in _inspector().get_indexes(table)}


def has_unique_constraint(table: str, name: str) -> bool:
    if not has_table(table):
        return False
    return name in {c["name"] for c in _inspector().get_unique_constraints(table)}


def has_foreign_key(table: str, name: str) -> bool:
    if not has_table(table):
        return False
    return name in {fk["name"] for fk in _inspector().get_foreign_keys(table)}


def has_check_constraint(table: str, name: str) -> bool:
    if not has_table(table):
        return False
    return name in {c["name"] for c in _inspector().get_check_constraints(table)}
