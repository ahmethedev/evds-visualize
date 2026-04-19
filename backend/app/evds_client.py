"""Thin wrapper around the `evds` PyPI package with SQLite TTL caching."""
from __future__ import annotations

import math
from datetime import datetime, timedelta
from functools import lru_cache
from typing import Any

from evds import evdsAPI

from .cache import cache
from .config import settings

SERIES_LIST_TTL = 7 * 24 * 3600
VALUES_DAILY_TTL = 3600
VALUES_MONTHLY_TTL = 12 * 3600
CATALOG_TTL = 7 * 24 * 3600


@lru_cache(maxsize=1)
def get_client() -> evdsAPI:
    return evdsAPI(settings.evds_api_key, lang="TR")


def api_key_looks_valid() -> bool:
    return bool(settings.evds_api_key) and len(settings.evds_api_key) >= 8


def _sanitize(rec: dict[str, Any]) -> dict[str, Any]:
    for k, v in list(rec.items()):
        if isinstance(v, float) and math.isnan(v):
            rec[k] = None
        elif not isinstance(v, (str, int, float, bool, type(None))):
            rec[k] = str(v)
    return rec


def get_main_categories() -> list[dict[str, Any]]:
    """Return all EVDS categories (flat list with CATEGORY_ID + TOPIC_TITLE_TR)."""
    key = "main_categories"
    hit = cache.get(key)
    if hit is not None:
        return hit
    df = get_client().main_categories
    records = [_sanitize(r) for r in df.to_dict(orient="records")]
    cache.set(key, records, CATALOG_TTL)
    return records


def get_datagroups_for_category(category_id: int) -> list[dict[str, Any]]:
    """Return datagroup metadata for a category id."""
    key = f"datagroups:{category_id}"
    hit = cache.get(key)
    if hit is not None:
        return hit
    try:
        df = get_client().get_sub_categories(category_id, detail=True)
    except Exception:
        cache.set(key, [], CATALOG_TTL)
        return []
    if df is None or len(df) == 0:
        cache.set(key, [], CATALOG_TTL)
        return []
    records = [_sanitize(r) for r in df.to_dict(orient="records")]
    cache.set(key, records, CATALOG_TTL)
    return records


def get_series_list(datagroup: str) -> list[dict[str, Any]]:
    """Return list of series metadata dicts for a datagroup."""
    key = f"series_list:{datagroup}"
    hit = cache.get(key)
    if hit is not None:
        return hit

    df = get_client().get_series(datagroup, detail=True)
    records = df.to_dict(orient="records")
    for rec in records:
        for k, v in list(rec.items()):
            if isinstance(v, float) and math.isnan(v):
                rec[k] = None
            elif not isinstance(v, (str, int, float, bool, type(None))):
                rec[k] = str(v)
    cache.set(key, records, SERIES_LIST_TTL)
    return records


def _fmt_date(d: datetime) -> str:
    return d.strftime("%d-%m-%Y")


def get_values(
    codes: list[str],
    start: datetime,
    end: datetime,
) -> list[dict[str, Any]]:
    """Return rows as [{date: 'YYYY-MM-DD', code1: val, code2: val, ...}].

    Keys in returned rows use SERIE_CODE (dots preserved). The evds package
    returns column names with dots replaced by underscores; we unmap.
    """
    cache_key = f"values:{','.join(sorted(codes))}:{_fmt_date(start)}:{_fmt_date(end)}"
    hit = cache.get(cache_key)
    if hit is not None:
        return hit

    api = get_client()
    startdate = _fmt_date(start)
    enddate = _fmt_date(end)

    import pandas as pd

    frames = []
    for i in range(0, len(codes), 25):
        batch = codes[i : i + 25]
        df = api.get_data(batch, startdate=startdate, enddate=enddate)
        if df is None or len(df) == 0:
            continue
        frames.append(df)
    if not frames:
        cache.set(cache_key, [], VALUES_DAILY_TTL)
        return []

    data = pd.concat(frames, axis=1)
    data = data.loc[:, ~data.columns.duplicated()]

    rev_map = {c.replace(".", "_"): c for c in codes}

    rows: list[dict[str, Any]] = []
    for _, r in data.iterrows():
        raw_date = r.get("Tarih")
        iso = _parse_tarih(raw_date)
        row: dict[str, Any] = {"date": iso}
        for col in data.columns:
            if col == "Tarih":
                continue
            original = rev_map.get(col)
            if original is None:
                continue
            v = r[col]
            if isinstance(v, float) and math.isnan(v):
                row[original] = None
            else:
                row[original] = float(v) if v is not None else None
        rows.append(row)

    cache.set(cache_key, rows, VALUES_DAILY_TTL)
    return rows


def _parse_tarih(raw: Any) -> str | None:
    """EVDS 'Tarih' comes as 'DD-MM-YYYY' or 'YYYY-M' (monthly). Normalize to ISO YYYY-MM-DD."""
    if raw is None:
        return None
    s = str(raw).strip()
    for fmt in ("%d-%m-%Y", "%Y-%m", "%Y-%m-%d"):
        try:
            dt = datetime.strptime(s, fmt)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue
    return s


def latest_values_by_code(
    codes: list[str],
    end: datetime | None = None,
    lookback_days: int = 120,
) -> tuple[dict[str, float | None], str | None]:
    """Pick the last row in the window; return (values_by_code, iso_date)."""
    end = end or datetime.now()
    start = end - timedelta(days=lookback_days)
    rows = get_values(codes, start, end)
    if not rows:
        return {c: None for c in codes}, None
    last = rows[-1]
    values = {c: last.get(c) for c in codes}
    return values, last.get("date")
