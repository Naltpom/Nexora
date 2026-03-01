"""Centralized pagination utilities for all paginated endpoints."""

import math
from typing import Any, Generic, TypeVar

from fastapi import Query
from pydantic import BaseModel
from sqlalchemy import Select, asc, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

T = TypeVar("T")


# ---------------------------------------------------------------------------
#  Pydantic schema (generic)
# ---------------------------------------------------------------------------


class PaginatedResponse(BaseModel, Generic[T]):
    """Standard paginated response envelope.

    Usage:
        response_model=PaginatedResponse[UserListItem]
    """

    items: list[T]
    total: int
    page: int
    per_page: int
    pages: int


# ---------------------------------------------------------------------------
#  FastAPI dependency for pagination query params
# ---------------------------------------------------------------------------


class PaginationParams:
    """Injectable FastAPI dependency that bundles page/per_page/sort/search params.

    Usage:
        async def list_items(
            pagination: PaginationParams = Depends(PaginationParams(default_per_page=20)),
        ):
    """

    def __init__(
        self,
        default_per_page: int = 20,
        max_per_page: int = 100,
        default_sort_by: str = "created_at",
        default_sort_dir: str = "desc",
    ):
        self._default_per_page = default_per_page
        self._max_per_page = max_per_page
        self._default_sort_by = default_sort_by
        self._default_sort_dir = default_sort_dir
        # Populated by __call__
        self.page: int = 1
        self.per_page: int = default_per_page
        self.sort_by: str = default_sort_by
        self.sort_dir: str = default_sort_dir
        self.search: str = ""

    def __call__(
        self,
        page: int = Query(1, ge=1),
        per_page: int = Query(None, ge=1),
        sort_by: str = Query(None),
        sort_dir: str = Query(None),
        search: str = Query(""),
    ) -> "PaginationParams":
        instance = PaginationParams(
            default_per_page=self._default_per_page,
            max_per_page=self._max_per_page,
            default_sort_by=self._default_sort_by,
            default_sort_dir=self._default_sort_dir,
        )
        instance.page = page
        instance.per_page = min(
            per_page if per_page is not None else self._default_per_page,
            self._max_per_page,
        )
        instance.sort_by = sort_by if sort_by is not None else self._default_sort_by
        instance.sort_dir = sort_dir if sort_dir is not None else self._default_sort_dir
        instance.search = search
        return instance

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.per_page


# ---------------------------------------------------------------------------
#  Search helpers
# ---------------------------------------------------------------------------


def escape_search(value: str) -> str:
    """Escape SQL LIKE wildcards for safe ilike() usage."""
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def search_like_pattern(value: str) -> str:
    """Return a '%escaped_value%' pattern ready for ilike()."""
    return f"%{escape_search(value)}%"


# ---------------------------------------------------------------------------
#  Paginate helper
# ---------------------------------------------------------------------------


def calc_pages(total: int, per_page: int) -> int:
    """Calculate total number of pages. Always at least 1."""
    return max(1, math.ceil(total / per_page)) if per_page > 0 else 1


async def paginate(
    db: AsyncSession,
    query: Select,
    params: PaginationParams,
    *,
    sort_whitelist: dict[str, Any] | None = None,
    default_sort_column: Any = None,
) -> tuple[Any, int, int]:
    """Apply count, sort, offset/limit to a SQLAlchemy Select query.

    Returns:
        (result, total, pages) where result is the executed query result.

    Args:
        db: Async database session.
        query: Base SQLAlchemy Select query (with filters already applied).
        params: PaginationParams instance.
        sort_whitelist: Mapping of sort_by string -> SQLAlchemy column.
            If None, sorting is skipped (caller manages sort themselves).
        default_sort_column: Fallback column if sort_by not in whitelist.
    """
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    if sort_whitelist is not None:
        sort_column = sort_whitelist.get(params.sort_by, default_sort_column)
        if sort_column is not None:
            order = desc(sort_column) if params.sort_dir == "desc" else asc(sort_column)
            query = query.order_by(order)

    query = query.offset(params.offset).limit(params.per_page)

    result = await db.execute(query)
    pages = calc_pages(total, params.per_page)

    return result, total, pages
