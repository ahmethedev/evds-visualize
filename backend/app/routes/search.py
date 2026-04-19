"""GET /api/search — full-text search over all EVDS series."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Query

from ..search import search_index

router = APIRouter(prefix="/api", tags=["search"])


@router.get("/search")
def search_series(
    q: str = Query(..., min_length=1, max_length=120),
    limit: int = Query(default=25, ge=1, le=100),
) -> dict[str, Any]:
    if not search_index.is_ready():
        search_index.ensure_built_async()
    results = search_index.search(q, limit=limit)
    stats = search_index.stats()
    return {
        "query": q,
        "results": results,
        "index_ready": stats["ready"],
        "index_building": stats["building"],
        "index_count": stats["count"],
    }


@router.get("/search/status")
def search_status() -> dict[str, Any]:
    return search_index.stats()
