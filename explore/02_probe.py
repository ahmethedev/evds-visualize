"""Probe strategic main categories — list datagroups and sample series for each.

Goal: find which EVDS hierarchies (a) have compositional structure that makes a
treemap mathematically sensible, and (b) tell a story a non-economist cares about.
"""
import json
import os
import time
from pathlib import Path

from evds import evdsAPI

API_KEY = os.environ["EVDS_API_KEY"]
CACHE = Path(__file__).parent / "cache"
CACHE.mkdir(exist_ok=True)

# Strategic top-level buckets (skipping 55 international, 10 surveys — secondary)
TARGETS = [
    (15, "Büyüme, İstihdam, Kamu Maliyesi"),
    (20, "Fiyat Endeksleri"),
    (25, "Döviz Kurları ve Kıymetli Madenler"),
    (30, "Merkez Bankası Bilanço"),
    (35, "Ödeme Sistemleri"),
    (40, "Ödemeler Dengesi ve Dış İstatistikler"),
    (45, "Parasal ve Finansal"),
    (50, "Reel Sektör"),
]

api = evdsAPI(API_KEY, lang="TR")

summary = {}
for cat_id, label in TARGETS:
    print(f"\n=== [{cat_id}] {label} ===")
    try:
        subs = api.get_sub_categories(cat_id, detail=True)
    except Exception as e:
        print(f"  ERROR: {e}")
        continue

    if subs.empty:
        print("  (empty — parent category, data is in numbered children)")
        summary[cat_id] = {"label": label, "datagroups": []}
        continue

    rows = []
    for _, r in subs.iterrows():
        rows.append({
            "code": r["DATAGROUP_CODE"],
            "name": r.get("DATAGROUP_NAME", ""),
            "freq": r.get("FREQUENCY_STR", ""),
            "start": r.get("START_DATE", ""),
            "end": r.get("END_DATE", ""),
            "source": r.get("DATASOURCE", ""),
        })
        print(f"  {r['DATAGROUP_CODE']:<18}  {r.get('DATAGROUP_NAME','')[:70]}")

    summary[cat_id] = {"label": label, "datagroups": rows}
    time.sleep(0.4)  # be kind to the API

(CACHE / "datagroups_by_category.json").write_text(
    json.dumps(summary, ensure_ascii=False, indent=2)
)
print(f"\nSaved {sum(len(s['datagroups']) for s in summary.values())} datagroups across {len(summary)} categories.")
print(f"Output: {CACHE / 'datagroups_by_category.json'}")
