"""ARQ job functions for search indexation."""

import logging

logger = logging.getLogger(__name__)


async def search_full_reindex(ctx, index_name: str | None = None) -> dict:
    """ARQ job: run a full reindex of one or all Meilisearch indexes."""
    # Ensure all feature models are loaded so SQLAlchemy relationships resolve
    from ...main import import_all_models

    import_all_models()

    from .services import configure_indexes, full_reindex

    await configure_indexes()
    result = await full_reindex(index_name)
    logger.info("Full reindex completed: %s", result)
    return result
