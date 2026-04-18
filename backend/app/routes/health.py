from fastapi import APIRouter

from ..cache import cache
from ..evds_client import api_key_looks_valid

router = APIRouter(tags=["health"])


@router.get("/healthz")
def healthz() -> dict[str, object]:
    return {
        "status": "ok",
        "evds_api_key_loaded": api_key_looks_valid(),
        "cache_purged": cache.purge_expired(),
    }
