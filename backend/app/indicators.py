"""Landing dashboard indicator config. Codes pinned from explore/08_find_indicators.py."""
from __future__ import annotations

from typing import Literal, TypedDict


class Indicator(TypedDict):
    code: str
    name: str
    label: str
    freq: Literal["daily", "weekly", "monthly"]
    unit: str
    datagroup: str
    transform: Literal["latest", "yoy_pct"]
    sparkline_months: int


INDICATORS: dict[str, Indicator] = {
    "usd_try": {
        "code": "TP.DK.USD.A.YTL",
        "name": "ABD Doları (Döviz Alış)",
        "label": "USD/TRY",
        "freq": "daily",
        "unit": "TL",
        "datagroup": "bie_dkdovytl",
        "transform": "latest",
        "sparkline_months": 12,
    },
    "eur_try": {
        "code": "TP.DK.EUR.A.YTL",
        "name": "Euro (Döviz Alış)",
        "label": "EUR/TRY",
        "freq": "daily",
        "unit": "TL",
        "datagroup": "bie_dkdovytl",
        "transform": "latest",
        "sparkline_months": 12,
    },
    "gold_gram": {
        "code": "TP.MK.KUL.YTL",
        "name": "Külçe Altın (TL/Gr)",
        "label": "Gram altın",
        "freq": "monthly",
        "unit": "TL/gr",
        "datagroup": "bie_mkaltytl",
        "transform": "latest",
        "sparkline_months": 24,
    },
    "cpi_yoy": {
        "code": "TP.TUKFIY2025.GENEL",
        "name": "TÜFE Genel Endeks (yıllık değişim)",
        "label": "TÜFE (yıllık)",
        "freq": "monthly",
        "unit": "%",
        "datagroup": "bie_tukfiy2025",
        "transform": "yoy_pct",
        "sparkline_months": 24,
    },
    "policy_rate": {
        "code": "TP.APIFON4",
        "name": "TCMB Ağırlıklı Ortalama Fonlama Maliyeti",
        "label": "Politika faizi",
        "freq": "daily",
        "unit": "%",
        "datagroup": "bie_apifon",
        "transform": "latest",
        "sparkline_months": 12,
    },
    "reserves_total": {
        "code": "TP.AB.TOPLAM",
        "name": "Toplam Rezerv",
        "label": "MB rezervi",
        "freq": "weekly",
        "unit": "Milyon USD",
        "datagroup": "bie_abres2",
        "transform": "latest",
        "sparkline_months": 12,
    },
    "unemployment": {
        "code": "TP.TIG08",
        "name": "İşsizlik Oranı",
        "label": "İşsizlik",
        "freq": "monthly",
        "unit": "%",
        "datagroup": "bie_tisguc",
        "transform": "latest",
        "sparkline_months": 24,
    },
    "current_account": {
        "code": "TP.ODEAYRSUNUM6.Q1",
        "name": "Cari İşlemler Hesabı",
        "label": "Cari denge",
        "freq": "monthly",
        "unit": "Milyon USD",
        "datagroup": "bie_odeayrsunum6",
        "transform": "latest",
        "sparkline_months": 24,
    },
}

ORDER = [
    "usd_try",
    "eur_try",
    "gold_gram",
    "cpi_yoy",
    "policy_rate",
    "reserves_total",
    "unemployment",
    "current_account",
]
