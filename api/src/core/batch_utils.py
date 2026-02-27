"""Centralized batch operations for maintenance commands.

Provides ``batch_delete`` that processes rows in manageable chunks,
committing between each chunk to release DB locks and avoid
transaction bloat.
"""

import logging

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from .config import settings

logger = logging.getLogger(__name__)


async def batch_delete(
    session_factory: async_sessionmaker[AsyncSession],
    model,
    where_clauses,
    *,
    batch_size: int | None = None,
    pk_column=None,
) -> int:
    """Delete rows matching *where_clauses* in chunks of *batch_size*.

    Each chunk is committed in its own transaction so that locks are
    released between batches and the WAL stays manageable.

    Parameters
    ----------
    session_factory:
        ``async_sessionmaker`` used to create independent sessions per batch.
    model:
        SQLAlchemy model class whose rows should be deleted.
    where_clauses:
        A single SQLAlchemy filter expression or a tuple/list of clauses.
    batch_size:
        Rows per batch.  Defaults to ``settings.PURGE_BATCH_SIZE``.
    pk_column:
        Primary-key column for chunked selects.  Defaults to ``model.id``.

    Returns
    -------
    int
        Total rows deleted.
    """
    if batch_size is None:
        batch_size = settings.PURGE_BATCH_SIZE
    if pk_column is None:
        pk_column = model.id

    clauses = where_clauses if isinstance(where_clauses, (list, tuple)) else (where_clauses,)
    total_deleted = 0

    while True:
        try:
            async with session_factory() as session:
                async with session.begin():
                    pk_query = select(pk_column).where(*clauses).limit(batch_size)
                    result = await session.execute(pk_query)
                    ids = result.scalars().all()

                    if not ids:
                        break

                    del_result = await session.execute(
                        delete(model).where(pk_column.in_(ids), *clauses)
                    )
                    batch_count = del_result.rowcount
        except Exception:
            logger.exception(
                "batch_delete %s: error after %d rows deleted",
                model.__tablename__,
                total_deleted,
            )
            raise

        total_deleted += batch_count
        logger.info(
            "batch_delete %s: deleted %d rows (total: %d)",
            model.__tablename__,
            batch_count,
            total_deleted,
        )

        if len(ids) < batch_size:
            break

    return total_deleted


