"""Inspect series structure of the most promising treemap-candidate datagroups."""
import json
import os
import time
from pathlib import Path

from evds import evdsAPI

API_KEY = os.environ["EVDS_API_KEY"]
CACHE = Path(__file__).parent / "cache"

# Top candidates for treemap composition views
DATAGROUPS = [
    ("bie_abanlbil", "TCMB Analitik Bilanço"),
    ("bie_mbblnca", "Merkez Bankası Bilançosu"),
    ("bie_kbmgel", "Merkezi Yönetim Bütçe Gelirleri"),
    ("bie_kbmgid", "Merkezi Yönetim Bütçe Harcamaları"),
    ("bie_krehacbs", "Krediler - Bankacılık Sektörü"),
    ("bie_pbpanal2", "Para Arzı ve Karşılık Kalemleri"),
    ("bie_abres2", "Merkez Bankası Rezervleri"),
    ("bie_tedavultut", "Tedavüldeki Banknotlar (TL)"),
    ("bie_tukfiy2025", "TÜFE 2025"),
    ("bie_kmmbgmv", "Mevduat (Vade Gruplarına Göre)"),
]

api = evdsAPI(API_KEY, lang="TR")

for code, label in DATAGROUPS:
    print(f"\n=== {code}  {label} ===")
    try:
        series = api.get_series(code, detail=True)
    except Exception as e:
        print(f"  ERROR: {e}")
        continue

    print(f"  total series: {len(series)}")
    # print first 15 series
    for _, r in series.head(15).iterrows():
        freq = r.get("FREQUENCY_STR", "")
        print(f"    {r['SERIE_CODE']:<24}  {r.get('SERIE_NAME', '')[:70]}  [{freq}]")
    if len(series) > 15:
        print(f"    ... and {len(series)-15} more")

    out = CACHE / f"series_{code}.json"
    records = series.to_dict(orient="records")
    # Convert any non-serializable to string
    for rec in records:
        for k, v in rec.items():
            if not isinstance(v, (str, int, float, bool, type(None))):
                rec[k] = str(v)
    out.write_text(json.dumps(records, ensure_ascii=False, indent=2))
    time.sleep(0.3)
