"""GET /api/dashboard — compact batch of headline indicators for the landing page.

Each indicator returns: latest value, timestamp, MoM/YoY changes, and a sparkline.
For `yoy_pct` transform the value *is* the YoY % of the index, not the index itself.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, HTTPException

from ..evds_client import get_values
from ..indicators import INDICATORS, ORDER, Indicator

router = APIRouter(prefix="/api", tags=["dashboard"])


def _lookback_days(freq: str, months: int) -> int:
    """How many days of raw data we need to cover `months` plus YoY comparison."""
    cover_months = months + 13
    return int(cover_months * 31) + 14


def _pct_change(curr: float | None, prev: float | None) -> float | None:
    if curr is None or prev is None or prev == 0:
        return None
    return (curr - prev) / abs(prev) * 100.0


def _abs_change(curr: float | None, prev: float | None) -> float | None:
    if curr is None or prev is None:
        return None
    return curr - prev


def _pick_non_null(rows: list[dict[str, Any]], code: str) -> list[tuple[str, float]]:
    out: list[tuple[str, float]] = []
    for r in rows:
        d = r.get("date")
        v = r.get(code)
        if d is None or v is None:
            continue
        out.append((d, float(v)))
    return out


def _find_at_or_before(points: list[tuple[str, float]], target_iso: str) -> tuple[str, float] | None:
    """Binary-ish scan: newest point whose date is <= target_iso."""
    best: tuple[str, float] | None = None
    for d, v in points:
        if d <= target_iso:
            best = (d, v)
        else:
            break
    return best


def _build_indicator(key: str, cfg: Indicator) -> dict[str, Any]:
    lookback = _lookback_days(cfg["freq"], cfg["sparkline_months"])
    end = datetime.now()
    start = end - timedelta(days=lookback)

    rows = get_values([cfg["code"]], start, end)
    points = _pick_non_null(rows, cfg["code"])

    if not points:
        return {
            "key": key,
            "label": cfg["label"],
            "name": cfg["name"],
            "unit": cfg["unit"],
            "freq": cfg["freq"],
            "datagroup": cfg["datagroup"],
            "series_code": cfg["code"],
            "transform": cfg["transform"],
            "value": None,
            "asof": None,
            "sparkline": [],
            "change_mom": None,
            "change_yoy": None,
            "change_mom_pct": None,
            "change_yoy_pct": None,
        }

    transform = cfg["transform"]

    if transform == "yoy_pct":
        # Emit YoY % as the value; sparkline = YoY % series; changes = MoM pp delta.
        yoy_series: list[tuple[str, float]] = []
        for i, (d, v) in enumerate(points):
            target = _shift_iso_months(d, -12)
            prev = _find_at_or_before(points[: i + 1], target)
            if prev is None or prev[1] == 0:
                continue
            yoy_pct = (v - prev[1]) / abs(prev[1]) * 100.0
            yoy_series.append((d, yoy_pct))

        if not yoy_series:
            return _empty(key, cfg)

        latest_d, latest_v = yoy_series[-1]
        # MoM delta (percentage points) between last two YoY readings
        prev_mom = yoy_series[-2] if len(yoy_series) >= 2 else None
        # YoY of the YoY — 12 entries back (monthly-ish)
        target_yoy = _shift_iso_months(latest_d, -12)
        prev_yoy = _find_at_or_before(yoy_series, target_yoy)

        sparkline = _trim_to_months(yoy_series, cfg["sparkline_months"])
        return {
            "key": key,
            "label": cfg["label"],
            "name": cfg["name"],
            "unit": cfg["unit"],
            "freq": cfg["freq"],
            "datagroup": cfg["datagroup"],
            "series_code": cfg["code"],
            "transform": transform,
            "value": latest_v,
            "asof": latest_d,
            "sparkline": [{"date": d, "value": v} for d, v in sparkline],
            "change_mom": _abs_change(latest_v, prev_mom[1] if prev_mom else None),
            "change_yoy": _abs_change(latest_v, prev_yoy[1] if prev_yoy else None),
            "change_mom_pct": None,
            "change_yoy_pct": None,
        }

    # transform == "latest"
    latest_d, latest_v = points[-1]
    prev_point = points[-2] if len(points) >= 2 else None

    target_month = _shift_iso_months(latest_d, -1)
    mom_point = _find_at_or_before(points[:-1], target_month) or prev_point

    target_year = _shift_iso_months(latest_d, -12)
    yoy_point = _find_at_or_before(points, target_year)

    sparkline = _trim_to_months(points, cfg["sparkline_months"])

    return {
        "key": key,
        "label": cfg["label"],
        "name": cfg["name"],
        "unit": cfg["unit"],
        "freq": cfg["freq"],
        "datagroup": cfg["datagroup"],
        "series_code": cfg["code"],
        "transform": transform,
        "value": latest_v,
        "asof": latest_d,
        "sparkline": [{"date": d, "value": v} for d, v in sparkline],
        "change_mom": _abs_change(latest_v, mom_point[1] if mom_point else None),
        "change_yoy": _abs_change(latest_v, yoy_point[1] if yoy_point else None),
        "change_mom_pct": _pct_change(latest_v, mom_point[1] if mom_point else None),
        "change_yoy_pct": _pct_change(latest_v, yoy_point[1] if yoy_point else None),
    }


def _empty(key: str, cfg: Indicator) -> dict[str, Any]:
    return {
        "key": key,
        "label": cfg["label"],
        "name": cfg["name"],
        "unit": cfg["unit"],
        "freq": cfg["freq"],
        "datagroup": cfg["datagroup"],
        "series_code": cfg["code"],
        "transform": cfg["transform"],
        "value": None,
        "asof": None,
        "sparkline": [],
        "change_mom": None,
        "change_yoy": None,
        "change_mom_pct": None,
        "change_yoy_pct": None,
    }


def _shift_iso_months(iso: str, months: int) -> str:
    """Shift YYYY-MM-DD by N months (clamping day to 28 for safety)."""
    y, m, d = (int(x) for x in iso.split("-"))
    total = y * 12 + (m - 1) + months
    ny, nm = divmod(total, 12)
    return f"{ny:04d}-{nm + 1:02d}-{min(d, 28):02d}"


def _trim_to_months(points: list[tuple[str, float]], months: int) -> list[tuple[str, float]]:
    if not points:
        return points
    cutoff = _shift_iso_months(points[-1][0], -months)
    return [p for p in points if p[0] >= cutoff]


@router.get("/dashboard")
def get_dashboard() -> dict[str, Any]:
    items: list[dict[str, Any]] = []
    errors: dict[str, str] = {}
    for key in ORDER:
        cfg = INDICATORS[key]
        try:
            items.append(_build_indicator(key, cfg))
        except Exception as exc:
            errors[key] = str(exc)
            items.append(_empty(key, cfg))
    if errors and len(errors) == len(ORDER):
        raise HTTPException(status_code=502, detail={"errors": errors})
    return {"indicators": items, "errors": errors or None}
