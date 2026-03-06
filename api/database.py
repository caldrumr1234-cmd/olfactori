"""
api/database.py — SQLite connection and helpers
"""
import sqlite3
import json
from pathlib import Path
import os

DB_PATH = Path(os.environ.get("DB_PATH", "data/sillage.db"))

def get_db():
    con = sqlite3.connect(DB_PATH, check_same_thread=False)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA foreign_keys=ON")
    try:
        yield con
    finally:
        con.close()

def row_to_dict(row) -> dict:
    if row is None:
        return {}
    d = {k: row[k] for k in row.keys()}
    json_fields = [
        "top_notes", "middle_notes", "base_notes",
        "main_accords", "season_tags", "occasion_tags",
        "override_fields", "fragrance_ids", "fragrance_names"
    ]
    for field in json_fields:
        if field in d and isinstance(d[field], str):
            try:
                d[field] = json.loads(d[field])
            except (json.JSONDecodeError, TypeError):
                d[field] = []
    return d

def rows_to_list(rows) -> list:
    return [row_to_dict(r) for r in rows]
