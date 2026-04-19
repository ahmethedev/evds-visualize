"""Phase 2 validation: smoke-test the 9 composition datagroups.

Runs get_series_list + latest_values_by_code + build_tree for each and
prints series count, tree depth, reported-vs-sum, unit hints, and any
failures. Invoke from repo root:

    uv run --project backend python explore/06_validate_datagroups.py
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.evds_client import get_series_list, latest_values_by_code  # noqa: E402
from app.hierarchy import build_tree  # noqa: E402

DATAGROUPS = [
    ("bie_tedavultut", "Tedavüldeki Banknotlar"),
    ("bie_tukfiy2025", "TÜFE 2025"),
    ("bie_abanlbil", "TCMB Analitik Bilanço"),
    ("bie_mbblnca", "TCMB Bilançosu"),
    ("bie_kbmgel", "Bütçe Gelirleri"),
    ("bie_kbmgid", "Bütçe Harcamaları"),
    ("bie_krehacbs", "Krediler — Bankacılık"),
    ("bie_pbpanal2", "Para Arzı"),
    ("bie_abres2", "MB Rezervleri"),
]


def tree_depth(node: dict) -> int:
    if not node["children"]:
        return 1
    return 1 + max(tree_depth(c) for c in node["children"])


def count_nodes(node: dict) -> int:
    return 1 + sum(count_nodes(c) for c in node["children"])


def count_missing(node: dict) -> int:
    miss = 1 if node["value"] is None and not node["children"] else 0
    return miss + sum(count_missing(c) for c in node["children"])


def main() -> None:
    print(f"{'datagroup':<18} {'label':<28} {'n_ser':>5} {'depth':>5} {'miss':>5} "
          f"{'src':<9} {'asof':<10} note")
    print("-" * 120)
    for code, label in DATAGROUPS:
        try:
            meta = get_series_list(code)
        except Exception as e:
            print(f"{code:<18} {label:<28} FAIL series_list: {e}")
            continue
        n = len(meta)
        codes = [s["SERIE_CODE"] for s in meta]
        try:
            values, asof = latest_values_by_code(codes)
        except Exception as e:
            print(f"{code:<18} {label:<28} {n:>5} FAIL values: {e}")
            continue
        try:
            tree = build_tree(meta, values, code, root_label=label)
        except Exception as e:
            print(f"{code:<18} {label:<28} {n:>5} FAIL tree: {e}")
            continue

        root = tree["root"]
        depth = tree_depth(root) - 1  # exclude synthetic root
        total_nodes = count_nodes(root) - 1
        miss = count_missing(root)
        src = tree["total_source"]

        note_parts = []
        reported = tree.get("reported_total")
        sum_comp = tree.get("sum_of_components")
        if reported is not None and sum_comp is not None:
            if reported > 0:
                diff_pct = (sum_comp - reported) / reported * 100
                if abs(diff_pct) > 1.0:
                    note_parts.append(f"sum/reported Δ={diff_pct:+.1f}%")
        if total_nodes == 0:
            note_parts.append("EMPTY tree")
        elif len(root["children"]) == 0:
            note_parts.append("no roots")
        if miss == total_nodes and total_nodes > 0:
            note_parts.append("ALL values missing")
        elif miss > total_nodes * 0.5:
            note_parts.append(f"{miss}/{total_nodes} missing")

        print(f"{code:<18} {label:<28} {n:>5} {depth:>5} {miss:>5} "
              f"{src:<9} {(asof or '-'):<10} {'; '.join(note_parts)}")


if __name__ == "__main__":
    main()
