"""Build a composition tree from EVDS series metadata + values.

Two detection paths:
  - Hierarchical: at least one series has UST_SERIE_CODE != "-1".
    We trust the API-provided parent-child links (works for TÜFE COICOP,
    TCMB bilanço, bütçe, etc.).
  - Flat: every series is level-1 (UST_SERIE_CODE == "-1").
    All non-total series become children of a synthetic root
    (e.g. Tedavüldeki Banknotlar).

A series is treated as the aggregate "total" (not a child) when its name
matches total-like patterns such as "Toplam" or "Genel Endeks".
"""
from __future__ import annotations

import re
from typing import Any

TOTAL_NAME_PATTERNS = (
    re.compile(r"\btoplam\b", re.IGNORECASE),
    re.compile(r"\bgenel endeks\b", re.IGNORECASE),
    re.compile(r"\btotal\b", re.IGNORECASE),
    re.compile(r"\bgeneral index\b", re.IGNORECASE),
)

_LEADING_LABEL_PREFIX = re.compile(r"^\s*[0-9A-Za-z]+\.\s*")
_TRAILING_UNIT = re.compile(r"\s*\([^)]*\)\s*$")


def _is_total_name(name: str) -> bool:
    return any(p.search(name) for p in TOTAL_NAME_PATTERNS)


def _clean_label(name: str) -> str:
    """Strip leading code prefix ("01. ") and trailing "(Tutar TL)"."""
    s = _TRAILING_UNIT.sub("", name).strip()
    s = _LEADING_LABEL_PREFIX.sub("", s).strip()
    return s or name.strip()


def _make_node(
    code: str,
    name: str,
    value: float | None,
    children: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    return {
        "code": code,
        "name": _clean_label(name),
        "raw_name": name,
        "value": value,
        "children": children or [],
    }


def build_tree(
    series_meta: list[dict[str, Any]],
    values_by_code: dict[str, float | None],
    datagroup: str,
    root_label: str | None = None,
) -> dict[str, Any]:
    """Return {root, total, total_source, unit_hint}.

    root: synthetic root node with children. total: the scalar used for
    pct-of-total. total_source: "reported" (Toplam series) or "sum" (sum of
    leaves) so the frontend can show a note when they diverge.
    """
    by_code: dict[str, dict[str, Any]] = {}
    total_entry: dict[str, Any] | None = None

    for row in series_meta:
        code = row["SERIE_CODE"]
        name = row.get("SERIE_NAME") or code
        value = values_by_code.get(code)
        node = _make_node(code, name, value)
        node["_ust"] = row.get("UST_SERIE_CODE") or "-1"
        node["_seviye"] = row.get("SEVIYE") or 1
        if _is_total_name(name) and total_entry is None:
            total_entry = node
            continue
        by_code[code] = node

    has_hierarchy = any(n["_ust"] != "-1" for n in by_code.values())

    roots: list[dict[str, Any]] = []
    if has_hierarchy:
        for node in by_code.values():
            parent_code = node["_ust"]
            parent = by_code.get(parent_code) if parent_code != "-1" else None
            if parent is None:
                roots.append(node)
            else:
                parent["children"].append(node)
    else:
        roots = list(by_code.values())

    def _strip_internal(n: dict[str, Any]) -> None:
        n.pop("_ust", None)
        n.pop("_seviye", None)
        for c in n["children"]:
            _strip_internal(c)

    for r in roots:
        _strip_internal(r)
    if total_entry is not None:
        _strip_internal(total_entry)

    def _leaf_sum(n: dict[str, Any]) -> float:
        if not n["children"]:
            return float(n["value"] or 0.0)
        return sum(_leaf_sum(c) for c in n["children"])

    sum_of_roots = sum(_leaf_sum(r) for r in roots)

    if total_entry is not None and total_entry["value"] is not None:
        total = float(total_entry["value"])
        total_source = "reported"
    else:
        total = sum_of_roots
        total_source = "sum"

    synthetic_root = {
        "code": datagroup,
        "name": root_label or datagroup,
        "raw_name": root_label or datagroup,
        "value": total,
        "children": roots,
    }

    return {
        "root": synthetic_root,
        "total": total,
        "total_source": total_source,
        "reported_total": float(total_entry["value"]) if total_entry and total_entry["value"] is not None else None,
        "sum_of_components": sum_of_roots,
    }
