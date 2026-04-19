"""GET /api/series/{code} — time series for a single EVDS series.

Figures out the datagroup from the series prefix (code.split('.')[0]) isn't
reliable since codes like `TP.APIFON4` don't match the `bie_*` datagroup slug.
Instead, when the caller provides `datagroup=`, we use it to look up metadata
(name, freq, unit). Without it we return the raw values and leave metadata blank.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, HTTPException, Path, Query

from ..evds_client import get_series_list, get_values

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["series"])


def _parse_date(s: str | None, default: datetime) -> datetime:
    if not s:
        return default
    for fmt in ("%Y-%m-%d", "%Y-%m", "%Y"):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    raise HTTPException(status_code=400, detail=f"Invalid date: {s}")


def _find_meta(datagroup: str | None, code: str) -> dict[str, Any] | None:
    if not datagroup:
        return None
    try:
        meta_list = get_series_list(datagroup)
    except Exception:
        return None
    for m in meta_list:
        if m.get("SERIE_CODE") == code:
            return m
    return None


@router.get("/series/{code}")
def get_series(
    code: str = Path(..., min_length=2, max_length=64, pattern=r"^[A-Za-z0-9._-]+$"),
    start: str | None = Query(default=None, max_length=10, pattern=r"^\d{4}(-\d{2}(-\d{2})?)?$"),
    end: str | None = Query(default=None, max_length=10, pattern=r"^\d{4}(-\d{2}(-\d{2})?)?$"),
    datagroup: str | None = Query(default=None, min_length=2, max_length=64, pattern=r"^[A-Za-z0-9_-]+$"),
) -> dict[str, Any]:
    end_dt = _parse_date(end, datetime.now())
    start_dt = _parse_date(start, end_dt - timedelta(days=365 * 10))
    if start_dt > end_dt:
        raise HTTPException(status_code=400, detail="start must be <= end")

    try:
        rows = get_values([code], start_dt, end_dt)
    except Exception as exc:
        log.exception("EVDS data fetch failed for %s", code)
        raise HTTPException(status_code=502, detail="Upstream veri kaynağına ulaşılamadı") from exc

    points = [
        {"date": r["date"], "value": r.get(code)}
        for r in rows
        if r.get("date") is not None and r.get(code) is not None
    ]

    meta = _find_meta(datagroup, code)
    return {
        "code": code,
        "datagroup": datagroup,
        "name": (meta or {}).get("SERIE_NAME"),
        "freq": (meta or {}).get("FREQUENCY_STR"),
        "start": (meta or {}).get("START_DATE"),
        "end": (meta or {}).get("END_DATE"),
        "source": (meta or {}).get("DATASOURCE"),
        "points": points,
    }
