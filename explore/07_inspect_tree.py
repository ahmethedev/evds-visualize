"""Dump the composition tree for a single datagroup to eyeball structure.

Usage:
    CACHE_DB_PATH=./backend/data/cache.db uv run --project backend \
        python explore/07_inspect_tree.py bie_pbpanal2
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.evds_client import get_series_list, latest_values_by_code  # noqa: E402
from app.hierarchy import build_tree  # noqa: E402


def dump(node: dict, depth: int = 0) -> None:
    indent = "  " * depth
    v = node["value"]
    vs = f"{v:>18,.2f}" if isinstance(v, (int, float)) else f"{'—':>18}"
    print(f"{indent}{vs}  {node['code']:<16} {node['raw_name'][:70]}")
    for c in node["children"]:
        dump(c, depth + 1)


def main() -> None:
    code = sys.argv[1] if len(sys.argv) > 1 else "bie_pbpanal2"
    meta = get_series_list(code)
    codes = [s["SERIE_CODE"] for s in meta]
    values, asof = latest_values_by_code(codes)
    tree = build_tree(meta, values, code, root_label=code)

    print(f"== {code}  asof={asof}")
    print(f"   n_series={len(meta)}  reported={tree.get('reported_total')}  "
          f"sum={tree.get('sum_of_components'):.2f}  source={tree['total_source']}")
    print()

    # Peek at a few raw rows to understand SEVIYE/UST pattern
    print("-- first 12 series meta rows --")
    for s in meta[:12]:
        print(f"  {s.get('SERIE_CODE'):<18} ust={s.get('UST_SERIE_CODE'):<18} "
              f"seviye={s.get('SEVIYE')} {(s.get('SERIE_NAME') or '')[:80]}")
    print()

    print("-- tree --")
    dump(tree["root"])


if __name__ == "__main__":
    main()
