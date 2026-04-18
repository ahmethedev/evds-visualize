"""Enumerate EVDS main categories and cache the result."""
import json
import os
from pathlib import Path

from evds import evdsAPI

API_KEY = os.environ["EVDS_API_KEY"]
CACHE = Path(__file__).parent / "cache"
CACHE.mkdir(exist_ok=True)

api = evdsAPI(API_KEY, lang="TR")

main = api.main_categories
print(f"\n=== {len(main)} main categories ===\n")
for _, row in main.iterrows():
    print(f"  {int(row['CATEGORY_ID']):>3}  {row['TOPIC_TITLE_TR']}")

main.to_json(CACHE / "main_categories.json", orient="records", force_ascii=False)
print(f"\nSaved to {CACHE / 'main_categories.json'}")
