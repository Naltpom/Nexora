"""Search API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..database import get_db
from ..events import event_bus
from ..permissions import load_user_permissions, require_permission
from ..security import get_current_user
from ..tasks import enqueue
from .schemas import GlobalSearchResult, IndexSearchResult, ReindexResponse

router = APIRouter()


@router.get(
    "",
    response_model=GlobalSearchResult,
    dependencies=[Depends(require_permission("search.global"))],
)
async def global_search(
    q: str = Query(..., min_length=2, max_length=200),
    limit: int = Query(5, ge=1, le=20),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Global multi-index search across all declared indexes."""
    if not settings.MEILISEARCH_ENABLED:
        raise HTTPException(status_code=503, detail="Search service unavailable")

    from .services import multi_search

    user_perms = await load_user_permissions(db, current_user.id)
    perm_set = {code for code, granted in user_perms.items() if granted is True}

    raw = await multi_search(query=q, limit_per_index=limit, user_permissions=perm_set)

    results = {}
    for index_name, data in raw.items():
        results[index_name] = IndexSearchResult(
            index=index_name,
            hits=data.get("hits", []),
            estimated_total_hits=data.get("estimatedTotalHits", 0),
            processing_time_ms=data.get("processingTimeMs", 0),
            query=q,
        )

    return GlobalSearchResult(results=results, query=q)


@router.get(
    "/{index_name}",
    response_model=IndexSearchResult,
    dependencies=[Depends(require_permission("search.global"))],
)
async def search_by_index(
    index_name: str,
    q: str = Query(..., min_length=1, max_length=200),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    filter: str | None = Query(None),
    sort: str | None = Query(None),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Search a specific index (for table-level acceleration)."""
    if not settings.MEILISEARCH_ENABLED:
        raise HTTPException(status_code=503, detail="Search service unavailable")

    from ..feature_registry import get_registry

    registry = get_registry()
    if not registry:
        raise HTTPException(status_code=503, detail="Registry not available")

    idx_config = None
    for _manifest, cfg in registry.collect_search_indexes():
        if cfg.index_name == index_name:
            idx_config = cfg
            break

    if not idx_config:
        raise HTTPException(status_code=404, detail=f"Index '{index_name}' not found")

    if idx_config.read_permission:
        user_perms = await load_user_permissions(db, current_user.id)
        if user_perms.get(idx_config.read_permission) is not True:
            raise HTTPException(status_code=403, detail="Permission denied for this index")

    from .services import search_index

    sort_list = [s.strip() for s in sort.split(",")] if sort else None

    result = await search_index(
        index_name,
        q,
        limit=limit,
        offset=offset,
        filter=filter,
        sort=sort_list,
    )

    return IndexSearchResult(
        index=index_name,
        hits=result.get("hits", []),
        estimated_total_hits=result.get("estimatedTotalHits", 0),
        processing_time_ms=result.get("processingTimeMs", 0),
        query=result.get("query", q),
    )


@router.post(
    "/reindex",
    response_model=ReindexResponse,
    dependencies=[Depends(require_permission("search.reindex"))],
)
async def trigger_reindex(
    index_name: str | None = Query(None),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin endpoint: trigger a full reindex via ARQ background job."""
    if not settings.MEILISEARCH_ENABLED:
        raise HTTPException(status_code=503, detail="Search service unavailable")

    await enqueue("search_full_reindex", index_name)

    await event_bus.emit(
        "search.reindex_started",
        db=db,
        actor_id=current_user.id,
        resource_type="search",
        resource_id=0,
        payload={"index": index_name or "all"},
    )

    target = f"of {index_name}" if index_name else "of all indexes"
    return ReindexResponse(status="started", message=f"Reindex {target} queued")
