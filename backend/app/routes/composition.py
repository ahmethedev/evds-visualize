"""GET /api/composition/{datagroup} — hierarchical snapshot for the treemap."""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from ..evds_client import get_series_list, get_values, latest_values_by_code
from ..hierarchy import build_tree

router = APIRouter(prefix="/api", tags=["composition"])

DATAGROUP_LABELS = {
    "bie_tedavultut": "Tedavüldeki Banknotlar",
    "bie_tukfiy2025": "TÜFE 2025",
    "bie_abanlbil": "TCMB Analitik Bilanço",
    "bie_mbblnca": "TCMB Bilançosu",
    "bie_kbmgel": "Bütçe Gelirleri",
    "bie_kbmgid": "Bütçe Harcamaları",
    "bie_krehacbs": "Krediler — Bankacılık",
    "bie_pbpanal2": "Para Arzı",
    "bie_abres2": "MB Rezervleri",
}


def _parse_asof(asof: str | None) -> datetime:
    if not asof:
        return datetime.now()
    for fmt in ("%Y-%m-%d", "%Y-%m"):
        try:
            return datetime.strptime(asof, fmt)
        except ValueError:
            continue
    raise HTTPException(status_code=400, detail=f"Invalid date: {asof}")


@router.get("/composition/{datagroup}")
def get_composition(
    datagroup: str,
    asof: str | None = Query(default=None, description="YYYY-MM-DD or YYYY-MM"),
) -> dict[str, Any]:
    try:
        series_meta = get_series_list(datagroup)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"EVDS series fetch failed: {exc}") from exc
    if not series_meta:
        raise HTTPException(status_code=404, detail=f"No series for datagroup {datagroup}")

    codes = [s["SERIE_CODE"] for s in series_meta]
    end = _parse_asof(asof)
    try:
        values, asof_date = latest_values_by_code(codes, end=end)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"EVDS data fetch failed: {exc}") from exc

    tree = build_tree(
        series_meta=series_meta,
        values_by_code=values,
        datagroup=datagroup,
        root_label=DATAGROUP_LABELS.get(datagroup, datagroup),
    )

    return {
        "datagroup": datagroup,
        "asof": asof_date,
        **tree,
    }


@router.get("/composition/{datagroup}/timeline")
def get_timeline(
    datagroup: str,
    years: int = Query(default=5, ge=1, le=20),
) -> dict[str, Any]:
    """Return [{date, total}] across the last `years` so the scrubber can plot it.

    Uses the same total logic as build_tree so the timeline matches the snapshot.
    """
    try:
        series_meta = get_series_list(datagroup)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"EVDS series fetch failed: {exc}") from exc
    if not series_meta:
        raise HTTPException(status_code=404, detail=f"No series for datagroup {datagroup}")

    codes = [s["SERIE_CODE"] for s in series_meta]
    end = datetime.now()
    start = end - timedelta(days=years * 365)
    try:
        rows = get_values(codes, start, end)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"EVDS data fetch failed: {exc}") from exc

    points: list[dict[str, Any]] = []
    total_source: str | None = None
    for row in rows:
        date = row.get("date")
        if not date:
            continue
        values = {c: row.get(c) for c in codes}
        if not any(v is not None for v in values.values()):
            continue
        tree = build_tree(series_meta, values, datagroup)
        if total_source is None:
            total_source = tree["total_source"]
        total = tree["total"]
        if total is None or total == 0:
            continue
        points.append({"date": date, "total": float(total)})

    return {
        "datagroup": datagroup,
        "total_source": total_source,
        "points": points,
    }
