"""Pydantic schemas for search API endpoints."""

from typing import Any

from pydantic import BaseModel


class IndexSearchResult(BaseModel):
    """Result from a single-index search."""

    index: str
    hits: list[dict[str, Any]]
    estimated_total_hits: int = 0
    processing_time_ms: int = 0
    query: str = ""


class GlobalSearchResult(BaseModel):
    """Result from multi-index global search."""

    results: dict[str, IndexSearchResult]
    query: str


class ReindexResponse(BaseModel):
    """Response from a reindex operation."""

    status: str = "started"
    message: str = ""
