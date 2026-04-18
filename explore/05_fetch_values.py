"""Fetch actual values for compositional datagroups. Verify treemap math."""
import json
import os
from datetime import datetime, timedelta
from pathlib import Path

from evds import evdsAPI

API_KEY = os.environ["EVDS_API_KEY"]
CACHE = Path(__file__).parent / "cache"
api = evdsAPI(API_KEY, lang="TR")


def fetch(code, days=90):
    series = api.get_series(code, detail=False)
    codes = series["SERIE_CODE"].tolist()
    start = (datetime.now() - timedelta(days=days)).strftime("%d-%m-%Y")
    end = datetime.now().strftime("%d-%m-%Y")
    # fetch in batches of 25 to avoid URL length limits
    frames = []
    for i in range(0, len(codes), 25):
        batch = codes[i : i + 25]
        df = api.get_data(batch, startdate=start, enddate=end)
        frames.append(df)
    import pandas as pd
    data = pd.concat(frames, axis=1)
    # drop dup Tarih columns
    data = data.loc[:, ~data.columns.duplicated()]
    return series, data


# 1) Banknot kompozisyonu (8 seri, en temiz test)
print("\n=== bie_tedavultut — Banknot kompozisyonu ===")
series, data = fetch("bie_tedavultut", days=60)
latest = data.iloc[-1] if len(data) else None
print(f"latest row date: {latest.get('Tarih') if latest is not None else 'N/A'}")
print(data.tail(3).to_string())

if latest is not None:
    total_row = None
    components = {}
    for _, srow in series.iterrows():
        col = srow["SERIE_CODE"].replace(".", "_")
        if col not in data.columns:
            continue
        val = latest[col]
        name = srow["SERIE_NAME"]
        if "Toplam" in name:
            total_row = val
        else:
            components[name] = val
    print(f"\nReported total: {total_row:,.0f} TL")
    print(f"Sum of components: {sum(components.values()):,.0f} TL")
    print(f"Components:")
    for n, v in sorted(components.items(), key=lambda x: -x[1]):
        pct = 100 * v / total_row if total_row else 0
        print(f"  {n[:50]:<50}  {v:>18,.0f} TL  ({pct:.1f}%)")

# 2) CBRT Rezervleri (3 seri)
print("\n\n=== bie_abres2 — MB Rezervleri ===")
series, data = fetch("bie_abres2", days=30)
print(data.tail(3).to_string())
