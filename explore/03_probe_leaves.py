"""Probe the 4-digit leaf categories — the actual datagroup containers."""
import json
import os
import time
from pathlib import Path

from evds import evdsAPI

API_KEY = os.environ["EVDS_API_KEY"]
CACHE = Path(__file__).parent / "cache"

# 4-digit categories that actually hold datagroups. Selected for general-public relevance.
TARGETS = [
    # Growth / employment / public finance
    (1501, "İşgücü İstatistikleri"),
    (1502, "Milli Gelir (GDP)"),
    (1503, "Kamu Finansmanı"),
    (1505, "İç Borç İstatistikleri"),
    # Prices
    (2005, "TÜFE (CPI)"),
    (2006, "Yurt İçi ÜFE"),
    (2003, "Konut Fiyat Endeksi"),
    # FX & Gold
    (2501, "TCMB Döviz Kurları"),
    (2502, "Altın İstatistikleri"),
    (2504, "Reel Efektif Döviz Kuru"),
    # CBRT Balance Sheet
    (3001, "Analitik Bilanço"),
    (3003, "Merkez Bankası Bilançosu"),
    (3004, "MB Haftalık Vaziyet"),
    # Balance of Payments / External
    (4001, "Ödemeler Dengesi"),
    (4003, "Uluslararası Rezervler"),
    # Monetary & Financial
    (450101, "Para Arzı (M1/M2/M3)"),
    (450104, "Mevduat"),
    (450105, "Krediler"),
    (450102, "Bankacılık Bilançoları"),
    # Payment systems
    (3502, "Tedavüldeki Banknotlar"),
    (3503, "Ödeme Sistemleri"),
]

api = evdsAPI(API_KEY, lang="TR")

summary = {}
for cat_id, label in TARGETS:
    print(f"\n=== [{cat_id}] {label} ===")
    try:
        subs = api.get_sub_categories(cat_id, detail=True)
    except Exception as e:
        print(f"  ERROR: {e}")
        summary[cat_id] = {"label": label, "error": str(e), "datagroups": []}
        continue

    if subs.empty:
        print("  (empty)")
        summary[cat_id] = {"label": label, "datagroups": []}
        continue

    rows = []
    for _, r in subs.iterrows():
        rows.append({
            "code": r["DATAGROUP_CODE"],
            "name": r.get("DATAGROUP_NAME", ""),
            "freq": str(r.get("FREQUENCY_STR", "")),
            "start": str(r.get("START_DATE", "")),
            "end": str(r.get("END_DATE", "")),
            "source": str(r.get("DATASOURCE", "")),
        })
    # print up to 10
    for r in rows[:10]:
        print(f"  {r['code']:<22}  {r['name'][:60]}")
    if len(rows) > 10:
        print(f"  ... and {len(rows)-10} more")

    summary[cat_id] = {"label": label, "datagroup_count": len(rows), "datagroups": rows}
    time.sleep(0.3)

(CACHE / "leaf_datagroups.json").write_text(
    json.dumps(summary, ensure_ascii=False, indent=2)
)
total = sum(s.get("datagroup_count", 0) for s in summary.values())
print(f"\n\nTotal datagroups across {len(summary)} categories: {total}")
