"""GET /api/catalog — lazy-loaded category → datagroup → series tree.

Call without `parent` for top-level categories. Pass `parent=<id>` for a
category's children (sub-categories + datagroups), or `parent=<datagroup_code>`
for the series inside a datagroup.
"""
from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from ..evds_client import (
    get_datagroups_for_category,
    get_main_categories,
    get_series_list,
)

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["catalog"])

TOP_LEVEL_IDS = {10, 15, 20, 25, 30, 35, 40, 45, 50, 55}
ARCHIVE_ROOT_ID = 0


def _title(cat: dict[str, Any]) -> str:
    raw = cat.get("TOPIC_TITLE_TR") or cat.get("TOPIC_TITLE_ENG") or ""
    return str(raw).strip()


def _category_depth(cat_id: int) -> int:
    """EVDS category IDs encode depth by digit count: 2 → top, 4 → sub, 6 → sub-sub."""
    s = str(cat_id)
    if cat_id in TOP_LEVEL_IDS:
        return 0
    if cat_id == ARCHIVE_ROOT_ID:
        return 0
    if len(s) == 4:
        return 1
    if len(s) == 6:
        return 2
    if s.startswith("999") and len(s) >= 5:
        return 1 if len(s) == 5 else 2
    return 1


def _parent_of(cat_id: int) -> int | None:
    s = str(cat_id)
    if cat_id in TOP_LEVEL_IDS or cat_id == ARCHIVE_ROOT_ID:
        return None
    if s.startswith("999"):
        return ARCHIVE_ROOT_ID if len(s) == 5 else int(s[:5])
    if len(s) == 4:
        return int(s[:2])
    if len(s) == 6:
        return int(s[:4])
    return None


def _top_level_nodes() -> list[dict[str, Any]]:
    cats = get_main_categories()
    nodes: list[dict[str, Any]] = []
    for c in cats:
        cid = int(c["CATEGORY_ID"])
        if cid in TOP_LEVEL_IDS:
            nodes.append(
                {
                    "id": str(cid),
                    "label": _title(c),
                    "type": "category",
                    "has_children": True,
                }
            )
    nodes.sort(key=lambda n: int(n["id"]))
    nodes.append(
        {"id": str(ARCHIVE_ROOT_ID), "label": "ARŞİV", "type": "category", "has_children": True}
    )
    return nodes


def _category_children(parent_id: int) -> list[dict[str, Any]]:
    cats = get_main_categories()
    sub_cats: list[dict[str, Any]] = []
    for c in cats:
        cid = int(c["CATEGORY_ID"])
        if _parent_of(cid) == parent_id:
            sub_cats.append(
                {
                    "id": str(cid),
                    "label": _title(c),
                    "type": "category",
                    "has_children": True,
                }
            )
    sub_cats.sort(key=lambda n: int(n["id"]))

    datagroups: list[dict[str, Any]] = []
    for dg in get_datagroups_for_category(parent_id):
        code = dg.get("DATAGROUP_CODE")
        if not code:
            continue
        datagroups.append(
            {
                "id": str(code),
                "label": str(dg.get("DATAGROUP_NAME") or code),
                "type": "datagroup",
                "has_children": True,
                "freq": dg.get("FREQUENCY_STR"),
                "source": dg.get("DATASOURCE"),
                "start": dg.get("START_DATE"),
                "end": dg.get("END_DATE"),
            }
        )
    datagroups.sort(key=lambda n: n["label"])

    return sub_cats + datagroups


def _series_children(datagroup: str) -> list[dict[str, Any]]:
    series = get_series_list(datagroup)
    out: list[dict[str, Any]] = []
    for s in series:
        code = s.get("SERIE_CODE")
        if not code:
            continue
        out.append(
            {
                "id": str(code),
                "label": str(s.get("SERIE_NAME") or code),
                "type": "series",
                "has_children": False,
                "freq": s.get("FREQUENCY_STR"),
                "start": s.get("START_DATE"),
                "end": s.get("END_DATE"),
                "datagroup": datagroup,
            }
        )
    return out


@router.get("/catalog")
def get_catalog(
    parent: str | None = Query(default=None, min_length=1, max_length=64, pattern=r"^[A-Za-z0-9_-]+$"),
) -> dict[str, Any]:
    if parent is None:
        return {"parent": None, "children": _top_level_nodes()}

    if parent.isdigit():
        try:
            return {"parent": parent, "children": _category_children(int(parent))}
        except Exception as exc:
            log.exception("catalog fetch failed for %s", parent)
            raise HTTPException(status_code=502, detail="Upstream veri kaynağına ulaşılamadı") from exc

    try:
        return {"parent": parent, "children": _series_children(parent)}
    except Exception as exc:
        log.exception("series list fetch failed for %s", parent)
        raise HTTPException(status_code=502, detail="Upstream veri kaynağına ulaşılamadı") from exc
