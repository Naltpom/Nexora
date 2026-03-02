"""Meilisearch client, index management, search, and indexation services."""

import importlib
import logging
from typing import Any

from meilisearch_python_sdk import AsyncClient
from meilisearch_python_sdk.models.settings import MeilisearchSettings

from ..config import settings
from ..feature_registry import get_registry

logger = logging.getLogger(__name__)

_client: AsyncClient | None = None


async def get_meili_client() -> AsyncClient:
    """Return the async Meilisearch client (lazy singleton)."""
    global _client
    if _client is None:
        _client = AsyncClient(
            url=settings.MEILISEARCH_URL,
            api_key=settings.MEILISEARCH_MASTER_KEY,
        )
    return _client


def _resolve_callable(module_path: str, func_name: str):
    """Import and return a function by module path and name."""
    mod = importlib.import_module(module_path)
    return getattr(mod, func_name)


# ── Index Management ──────────────────────────────────────────────


async def configure_indexes() -> None:
    """Create/update all Meilisearch indexes declared in active feature manifests."""
    if not settings.MEILISEARCH_ENABLED:
        return

    registry = get_registry()
    if not registry:
        return

    client = await get_meili_client()

    for _manifest, idx_config in registry.collect_search_indexes():
        try:
            await client.create_index(
                uid=idx_config.index_name,
                primary_key=idx_config.primary_key,
            )
        except Exception:
            pass  # Index already exists

        index = client.index(idx_config.index_name)
        meili_settings = MeilisearchSettings(
            searchable_attributes=idx_config.searchable_attributes or None,
            filterable_attributes=idx_config.filterable_attributes or None,
            sortable_attributes=idx_config.sortable_attributes or None,
            displayed_attributes=idx_config.displayed_attributes or None,
        )
        await index.update_settings(meili_settings)
        logger.info("Configured Meilisearch index '%s'", idx_config.index_name)


# ── Document Indexation ───────────────────────────────────────────


async def index_documents(index_name: str, documents: list[dict]) -> None:
    """Add or update documents in a Meilisearch index."""
    if not settings.MEILISEARCH_ENABLED or not documents:
        return
    client = await get_meili_client()
    index = client.index(index_name)
    await index.add_documents(documents)


async def delete_document(index_name: str, document_id: int | str) -> None:
    """Remove a single document from a Meilisearch index."""
    if not settings.MEILISEARCH_ENABLED:
        return
    client = await get_meili_client()
    index = client.index(index_name)
    await index.delete_document(str(document_id))


async def index_single(index_name: str, document: dict) -> None:
    """Index (add/update) a single document."""
    await index_documents(index_name, [document])


# ── Bulk Reindex ──────────────────────────────────────────────────


async def full_reindex(index_name: str | None = None) -> dict[str, int]:
    """Reindex all documents from DB into Meilisearch.

    If index_name is None, reindex all declared indexes.
    Returns {index_name: document_count}.
    """
    from sqlalchemy import func, select

    from ..database import async_session

    if not settings.MEILISEARCH_ENABLED:
        return {}

    registry = get_registry()
    if not registry:
        return {}

    results = {}
    batch_size = 500

    for _manifest, idx_config in registry.collect_search_indexes():
        if index_name and idx_config.index_name != index_name:
            continue

        model_mod = importlib.import_module(idx_config.model_module)
        model_cls = getattr(model_mod, idx_config.model_class)

        serializer = _resolve_callable(idx_config.serializer_module, idx_config.serializer_function)

        base_filter = None
        if idx_config.base_filter_module and idx_config.base_filter_function:
            base_filter = _resolve_callable(idx_config.base_filter_module, idx_config.base_filter_function)

        client = await get_meili_client()
        index = client.index(idx_config.index_name)
        await index.delete_all_documents()

        async with async_session() as db:
            query = select(model_cls)
            if base_filter:
                query = query.where(base_filter())

            count_q = select(func.count()).select_from(query.subquery())
            total = (await db.execute(count_q)).scalar() or 0

            offset = 0
            indexed = 0
            while offset < total:
                batch_q = query.offset(offset).limit(batch_size)
                result = await db.execute(batch_q)
                records = result.scalars().all()
                if not records:
                    break

                documents = [serializer(r) for r in records]
                await index_documents(idx_config.index_name, documents)
                indexed += len(documents)
                offset += batch_size

            results[idx_config.index_name] = indexed
            logger.info("Reindexed %d documents into '%s'", indexed, idx_config.index_name)

    return results


# ── Search ────────────────────────────────────────────────────────


async def search_index(
    index_name: str,
    query: str,
    *,
    limit: int = 20,
    offset: int = 0,
    filter: str | list | None = None,
    sort: list[str] | None = None,
) -> dict[str, Any]:
    """Search a single Meilisearch index."""
    if not settings.MEILISEARCH_ENABLED:
        return {"hits": [], "estimatedTotalHits": 0, "query": query}

    client = await get_meili_client()
    index = client.index(index_name)
    result = await index.search(
        query,
        limit=limit,
        offset=offset,
        filter=filter,
        sort=sort,
    )
    return {
        "hits": result.hits,
        "estimatedTotalHits": result.estimated_total_hits,
        "processingTimeMs": result.processing_time_ms,
        "query": result.query,
    }


async def multi_search(
    query: str,
    *,
    indexes: list[str] | None = None,
    limit_per_index: int = 5,
    user_permissions: set[str] | None = None,
) -> dict[str, Any]:
    """Search across multiple indexes, respecting user permissions."""
    if not settings.MEILISEARCH_ENABLED:
        return {}

    registry = get_registry()
    if not registry:
        return {}

    results = {}

    for _manifest, idx_config in registry.collect_search_indexes():
        if indexes and idx_config.index_name not in indexes:
            continue

        if user_permissions is not None and idx_config.read_permission:
            if idx_config.read_permission not in user_permissions:
                continue

        try:
            client = await get_meili_client()
            index = client.index(idx_config.index_name)
            result = await index.search(query, limit=limit_per_index)
            results[idx_config.index_name] = {
                "hits": result.hits,
                "estimatedTotalHits": result.estimated_total_hits,
                "processingTimeMs": result.processing_time_ms,
            }
        except Exception:
            logger.exception("Search failed for index '%s'", idx_config.index_name)
            results[idx_config.index_name] = {"hits": [], "estimatedTotalHits": 0, "error": True}

    return results
