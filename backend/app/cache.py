"""SQLite TTL cache for EVDS responses.

Simple key-value store with expiration. Values are JSON-encoded.
"""
from __future__ import annotations

import json
import sqlite3
import time
from pathlib import Path
from typing import Any

from .config import settings

_SCHEMA = """
CREATE TABLE IF NOT EXISTS cache (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    expires_at REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache(expires_at);
"""


class Cache:
    def __init__(self, db_path: str) -> None:
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(db_path, check_same_thread=False, isolation_level=None)
        self._conn.executescript(_SCHEMA)

    def get(self, key: str) -> Any | None:
        row = self._conn.execute(
            "SELECT value, expires_at FROM cache WHERE key = ?", (key,)
        ).fetchone()
        if row is None:
            return None
        value, expires_at = row
        if expires_at < time.time():
            self._conn.execute("DELETE FROM cache WHERE key = ?", (key,))
            return None
        return json.loads(value)

    def set(self, key: str, value: Any, ttl_seconds: int) -> None:
        self._conn.execute(
            "INSERT OR REPLACE INTO cache (key, value, expires_at) VALUES (?, ?, ?)",
            (key, json.dumps(value, default=str), time.time() + ttl_seconds),
        )

    def purge_expired(self) -> int:
        cur = self._conn.execute("DELETE FROM cache WHERE expires_at < ?", (time.time(),))
        return cur.rowcount


cache = Cache(settings.cache_db_path)
