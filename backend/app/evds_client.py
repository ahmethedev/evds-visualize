"""Thin wrapper around the `evds` PyPI package.

Faz 0'da sadece istemciyi initialize edip basit bir healthcheck (API key geçerli mi)
sağlıyoruz. Gerçek veri çağrıları Faz 1'de eklenecek.
"""
from __future__ import annotations

from functools import lru_cache

from evds import evdsAPI

from .config import settings


@lru_cache(maxsize=1)
def get_client() -> evdsAPI:
    return evdsAPI(settings.evds_api_key)


def api_key_looks_valid() -> bool:
    """API anahtarının format olarak mevcut olup olmadığını kontrol eder.

    Gerçek doğrulama ilk veri çağrısında olur; burada sadece env'in yüklendiğini
    teyit ediyoruz.
    """
    return bool(settings.evds_api_key) and len(settings.evds_api_key) >= 8
