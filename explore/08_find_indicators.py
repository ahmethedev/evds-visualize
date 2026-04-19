"""Pin down exact SERIE_CODEs for landing-page indicators.

Targets:
- USD/TRY, EUR/TRY  (bie_dkdovytl — daily FX)
- Gram gold TRY     (bie_mkaltytl — monthly)
- CPI headline YoY  (bie_tukfiy2025 GENEL + YoY math)
- TCMB reserves     (bie_abres2 — total)
- Unemployment      (bie_tisguc — seasonally adjusted)
- Policy rate       (search cat 3002 PIYASA VERILERI)
- Current account   (bie_odeayrsunum6 — monthly)

Output: explore/cache/indicators.json  → dict of {key: {code, name, freq, unit, note}}
"""
import json
import os
import time
from pathlib import Path

from evds import evdsAPI

API_KEY = os.environ["EVDS_API_KEY"]
CACHE = Path(__file__).parent / "cache"
CACHE.mkdir(exist_ok=True)
api = evdsAPI(API_KEY, lang="TR")


def list_series(datagroup: str) -> list[dict]:
    cache_file = CACHE / f"series_{datagroup}.json"
    if cache_file.exists():
        return json.loads(cache_file.read_text())
    df = api.get_series(datagroup, detail=True)
    records = df.to_dict(orient="records")
    # make JSON-safe
    import math
    for rec in records:
        for k, v in list(rec.items()):
            if isinstance(v, float) and math.isnan(v):
                rec[k] = None
            elif not isinstance(v, (str, int, float, bool, type(None))):
                rec[k] = str(v)
    cache_file.write_text(json.dumps(records, ensure_ascii=False, indent=2))
    return records


def find_one(records: list[dict], predicate, label: str) -> dict | None:
    matches = [r for r in records if predicate(r)]
    print(f"  {label}: {len(matches)} match(es)")
    for m in matches[:5]:
        print(f"    - {m['SERIE_CODE']:<30} {m.get('SERIE_NAME','')[:90]}")
    return matches[0] if matches else None


result: dict[str, dict] = {}


# --- FX: USD/TRY, EUR/TRY (daily, "Döviz Alış")  ---
print("\n[bie_dkdovytl] Döviz Kurları")
fx = list_series("bie_dkdovytl")
# SERIE_NAME patterns like "(ABD DOLARI) (Döviz Alış)" — we want primary fixed rate, not crossed
usd = find_one(
    fx,
    lambda r: "ABD DOLARI" in (r.get("SERIE_NAME") or "").upper()
    and "DÖVİZ ALIŞ" in (r.get("SERIE_NAME") or "").upper()
    and "ÇAPRAZ" not in (r.get("SERIE_NAME") or "").upper(),
    "USD/TRY",
)
eur = find_one(
    fx,
    lambda r: "EURO" in (r.get("SERIE_NAME") or "").upper()
    and "DÖVİZ ALIŞ" in (r.get("SERIE_NAME") or "").upper()
    and "ÇAPRAZ" not in (r.get("SERIE_NAME") or "").upper(),
    "EUR/TRY",
)
if usd:
    result["usd_try"] = {"code": usd["SERIE_CODE"], "name": usd["SERIE_NAME"], "freq": "daily", "unit": "TL", "datagroup": "bie_dkdovytl"}
if eur:
    result["eur_try"] = {"code": eur["SERIE_CODE"], "name": eur["SERIE_NAME"], "freq": "daily", "unit": "TL", "datagroup": "bie_dkdovytl"}


# --- Gold: gram TRY ---
print("\n[bie_mkaltytl] Altın Fiyatları")
gold = list_series("bie_mkaltytl")
# Series likely: "Altın (TL/Gram)" or similar
gram = find_one(
    gold,
    lambda r: "GRAM" in (r.get("SERIE_NAME") or "").upper() or "1 GRAM" in (r.get("SERIE_NAME") or "").upper(),
    "Gram altın",
) or (gold[0] if gold else None)
if gram:
    result["gold_gram"] = {"code": gram["SERIE_CODE"], "name": gram["SERIE_NAME"], "freq": "monthly", "unit": "TL/gram", "datagroup": "bie_mkaltytl"}


# --- CPI headline (bie_tukfiy2025 GENEL) ---
print("\n[bie_tukfiy2025] TÜFE 2025 — aramaya gerek yok, GENEL kodu biliniyor")
cpi_rows = list_series("bie_tukfiy2025")
cpi_general = find_one(
    cpi_rows,
    lambda r: "GENEL" in (r.get("SERIE_NAME") or "").upper()
    and (r.get("UST_SERIE_CODE") in (None, "", "0"))
    and "ENDEKS" in (r.get("SERIE_NAME") or "").upper(),
    "TÜFE Genel endeks",
)
if not cpi_general:
    cpi_general = find_one(
        cpi_rows, lambda r: (r.get("SERIE_NAME") or "").strip().upper() == "GENEL", "GENEL fallback"
    )
if cpi_general:
    result["cpi_yoy"] = {"code": cpi_general["SERIE_CODE"], "name": cpi_general["SERIE_NAME"], "freq": "monthly", "unit": "YoY %", "datagroup": "bie_tukfiy2025", "transform": "yoy_pct"}


# --- Reserves: bie_abres2 total ---
print("\n[bie_abres2] MB Rezervleri")
res_rows = list_series("bie_abres2")
total = find_one(
    res_rows,
    lambda r: "TOPLAM" in (r.get("SERIE_NAME") or "").upper() or "GENEL TOPLAM" in (r.get("SERIE_NAME") or "").upper(),
    "Toplam rezerv",
)
if not total and res_rows:
    # Pick the row whose value is sum of others — fallback: first
    total = res_rows[0]
if total:
    result["reserves_total"] = {"code": total["SERIE_CODE"], "name": total["SERIE_NAME"], "freq": "weekly", "unit": "USD", "datagroup": "bie_abres2"}


# --- Unemployment: bie_tisguc ---
print("\n[bie_tisguc] İşgücü (mevsimsellikten arındırılmış)")
lab_rows = list_series("bie_tisguc")
unemp = find_one(
    lab_rows,
    lambda r: "İŞSİZLİK ORANI" in (r.get("SERIE_NAME") or "").upper()
    and "15" in (r.get("SERIE_NAME") or "")
    and "GENÇ" not in (r.get("SERIE_NAME") or "").upper(),
    "İşsizlik oranı (15+)",
)
if not unemp:
    unemp = find_one(lab_rows, lambda r: "İŞSİZLİK ORANI" in (r.get("SERIE_NAME") or "").upper(), "İşsizlik fallback")
if unemp:
    result["unemployment"] = {"code": unemp["SERIE_CODE"], "name": unemp["SERIE_NAME"], "freq": "monthly", "unit": "%", "datagroup": "bie_tisguc"}


# --- Current account: bie_odeayrsunum6 ---
print("\n[bie_odeayrsunum6] Ödemeler Dengesi (Ayrıntılı)")
bop_rows = list_series("bie_odeayrsunum6")
ca = find_one(
    bop_rows,
    lambda r: "CARİ İŞLEMLER" in (r.get("SERIE_NAME") or "").upper()
    and ("DENGE" in (r.get("SERIE_NAME") or "").upper() or "HESAP" in (r.get("SERIE_NAME") or "").upper())
    and (r.get("UST_SERIE_CODE") in (None, "", "0")),
    "Cari işlemler hesabı (root)",
)
if not ca:
    ca = find_one(bop_rows, lambda r: "CARİ İŞLEMLER" in (r.get("SERIE_NAME") or "").upper(), "Cari fallback")
if ca:
    result["current_account"] = {"code": ca["SERIE_CODE"], "name": ca["SERIE_NAME"], "freq": "monthly", "unit": "USD mn", "datagroup": "bie_odeayrsunum6"}


# --- Policy rate: PIYASA VERILERI (cat 3002) or REESKONT (cat 450504) ---
print("\n[cat 3002] Piyasa Verileri alt-datagroup'ları")
try:
    subs = api.get_sub_categories(3002, detail=True)
    print(subs[["DATAGROUP_CODE", "DATAGROUP_NAME"]].to_string())
    subs_list = subs.to_dict(orient="records")
except Exception as e:
    print(f"  ERROR: {e}")
    subs_list = []

policy_candidate = None
policy_dg = None
for row in subs_list:
    name_u = (row.get("DATAGROUP_NAME") or "").upper()
    if "FAİZ" in name_u or "POLİTİKA" in name_u or "REPO" in name_u:
        dg = row["DATAGROUP_CODE"]
        print(f"\n  Probing {dg} — {row.get('DATAGROUP_NAME','')}")
        series = list_series(dg)
        hit = find_one(
            series,
            lambda r: "POLİTİKA FAİZ" in (r.get("SERIE_NAME") or "").upper()
            or "1 HAFTA" in (r.get("SERIE_NAME") or "").upper()
            or "HAFTALIK REPO" in (r.get("SERIE_NAME") or "").upper(),
            f"Politika faizi içinde {dg}",
        )
        if hit and not policy_candidate:
            policy_candidate = hit
            policy_dg = dg
        time.sleep(0.4)

if policy_candidate:
    result["policy_rate"] = {
        "code": policy_candidate["SERIE_CODE"],
        "name": policy_candidate["SERIE_NAME"],
        "freq": "daily",
        "unit": "%",
        "datagroup": policy_dg,
    }
else:
    print("\n  Policy rate not found in 3002 — try 450504 (Reeskont/Avans)")
    try:
        subs = api.get_sub_categories(450504, detail=True)
        subs_list = subs.to_dict(orient="records")
        for row in subs_list[:3]:
            dg = row["DATAGROUP_CODE"]
            print(f"  Probing {dg} — {row.get('DATAGROUP_NAME','')}")
            series = list_series(dg)
            for r in series[:10]:
                print(f"    {r['SERIE_CODE']:<30} {r.get('SERIE_NAME','')[:90]}")
    except Exception as e:
        print(f"  ERROR: {e}")


print("\n\n=== FINAL INDICATOR MAP ===")
for k, v in result.items():
    print(f"  {k:<18} {v['code']:<30} {v['name'][:70]}")

(CACHE / "indicators.json").write_text(json.dumps(result, ensure_ascii=False, indent=2))
print(f"\nSaved {len(result)} indicators → {CACHE / 'indicators.json'}")
