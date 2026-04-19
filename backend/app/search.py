"""SQLite FTS5 full-text index over every EVDS series name/code.

Populated by walking every category → datagroup → series via cached EVDS calls.
First build is slow (hundreds of API calls if nothing is cached); subsequent
rebuilds are cheap because the wrapper cache kicks in. Background thread on
startup keeps the request path non-blocking.
"""
from __future__ import annotations

import sqlite3
import threading
import time
from pathlib import Path
from typing import Any

from .config import settings
from .evds_client import (
    get_datagroups_for_category,
    get_main_categories,
    get_series_list,
)

INDEX_TTL_SECONDS = 7 * 24 * 3600


class SearchIndex:
    def __init__(self, db_path: str) -> None:
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(db_path, check_same_thread=False, isolation_level=None)
        self._conn.executescript(
            """
            CREATE VIRTUAL TABLE IF NOT EXISTS series_index USING fts5(
              code, name, datagroup, datagroup_name,
              tokenize='unicode61 remove_diacritics 2'
            );
            CREATE TABLE IF NOT EXISTS index_meta (
              key TEXT PRIMARY KEY,
              value TEXT NOT NULL
            );
            """
        )
        self._write_lock = threading.Lock()
        self._build_lock = threading.Lock()
        self._building = False

    def _get_meta(self, key: str) -> str | None:
        row = self._conn.execute(
            "SELECT value FROM index_meta WHERE key = ?", (key,)
        ).fetchone()
        return row[0] if row else None

    def is_ready(self) -> bool:
        built = self._get_meta("built_at")
        if built is None:
            return False
        try:
            return (time.time() - float(built)) < INDEX_TTL_SECONDS
        except ValueError:
            return False

    def is_building(self) -> bool:
        return self._building

    def ensure_built(self, force: bool = False) -> None:
        if not force and self.is_ready():
            return
        with self._build_lock:
            if not force and self.is_ready():
                return
            if self._building:
                return
            self._building = True
        try:
            self._rebuild()
        finally:
            with self._build_lock:
                self._building = False

    def ensure_built_async(self) -> None:
        if self.is_ready() or self._building:
            return
        threading.Thread(target=self.ensure_built, daemon=True).start()

    def _rebuild(self) -> None:
        cats = get_main_categories()
        dg_name_by_code: dict[str, str] = {}
        visited_cats: set[int] = set()
        for c in cats:
            try:
                cid = int(c["CATEGORY_ID"])
            except (KeyError, TypeError, ValueError):
                continue
            if cid in visited_cats:
                continue
            visited_cats.add(cid)
            try:
                dgs = get_datagroups_for_category(cid)
            except Exception:
                dgs = []
            for dg in dgs:
                code = dg.get("DATAGROUP_CODE")
                if not code:
                    continue
                dg_name_by_code[str(code)] = str(dg.get("DATAGROUP_NAME") or code)

        rows: list[tuple[str, str, str, str]] = []
        for dg_code, dg_name in dg_name_by_code.items():
            try:
                series = get_series_list(dg_code)
            except Exception:
                continue
            for s in series:
                scode = s.get("SERIE_CODE")
                if not scode:
                    continue
                rows.append(
                    (
                        str(scode),
                        str(s.get("SERIE_NAME") or ""),
                        dg_code,
                        dg_name,
                    )
                )

        with self._write_lock:
            self._conn.execute("DELETE FROM series_index")
            self._conn.executemany(
                "INSERT INTO series_index (code, name, datagroup, datagroup_name)"
                " VALUES (?, ?, ?, ?)",
                rows,
            )
            self._conn.execute(
                "INSERT OR REPLACE INTO index_meta (key, value) VALUES ('built_at', ?)",
                (str(time.time()),),
            )
            self._conn.execute(
                "INSERT OR REPLACE INTO index_meta (key, value) VALUES ('count', ?)",
                (str(len(rows)),),
            )

    @staticmethod
    def _quote_token(tok: str) -> str:
        escaped = tok.replace('"', '""')
        return f'"{escaped}"*'

    def search(self, q: str, limit: int = 25) -> list[dict[str, str]]:
        tokens = [t for t in q.split() if t]
        if not tokens:
            return []
        match = " ".join(self._quote_token(t) for t in tokens)
        try:
            cur = self._conn.execute(
                """
                SELECT code, name, datagroup, datagroup_name
                FROM series_index
                WHERE series_index MATCH ?
                ORDER BY bm25(series_index) LIMIT ?
                """,
                (match, limit),
            )
        except sqlite3.OperationalError:
            return []
        return [
            {
                "code": code,
                "name": name,
                "datagroup": datagroup,
                "datagroup_name": datagroup_name,
            }
            for code, name, datagroup, datagroup_name in cur.fetchall()
        ]

    def stats(self) -> dict[str, Any]:
        count = self._get_meta("count")
        built_at = self._get_meta("built_at")
        return {
            "ready": self.is_ready(),
            "building": self.is_building(),
            "count": int(count) if count else 0,
            "built_at": float(built_at) if built_at else None,
        }


search_index = SearchIndex(settings.search_db_path)
