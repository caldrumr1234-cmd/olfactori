"""
migrate.py — Olfactori database migration
Safely upgrades sillage.db with all new tables and columns.
Run: python migrate.py
"""
import sqlite3
from pathlib import Path

DB_PATH = Path("data/sillage.db")

def add_column(con, table, column, definition):
    """Add a column only if it doesn't already exist."""
    existing = [row[1] for row in con.execute(f"PRAGMA table_info({table})").fetchall()]
    if column not in existing:
        con.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")
        print(f"  + {table}.{column}")
    else:
        print(f"  ~ {table}.{column} (already exists)")

def main():
    if not DB_PATH.exists():
        print(f"ERROR: Database not found at {DB_PATH}")
        return

    con = sqlite3.connect(DB_PATH)
    con.execute("PRAGMA journal_mode=WAL")

    print("\n── Upgrading fragrances table ──")
    new_columns = [
        ("enrichment_source",    "TEXT DEFAULT 'fragella'"),
        ("fragella_image_url",   "TEXT"),
        ("season_tags",          "TEXT DEFAULT '[]'"),
        ("occasion_tags",        "TEXT DEFAULT '[]'"),
        ("manually_edited",      "INTEGER DEFAULT 0"),
        ("enrichment_locked",    "INTEGER DEFAULT 0"),
        ("override_fields",      "TEXT DEFAULT '{}'"),
        ("personal_rating",      "REAL"),
        ("purchase_price",       "REAL"),
        ("purchase_date",        "TEXT"),
        ("purchase_url",         "TEXT"),
        ("current_market_price", "REAL"),
        ("bottle_percentage",    "REAL DEFAULT 100.0"),
        ("decant_available",     "INTEGER DEFAULT 0"),
        ("decant_size_ml",       "REAL"),
        ("reformulation_notes",  "TEXT"),
        ("is_reformulated",      "INTEGER DEFAULT 0"),
        ("country_of_origin",    "TEXT"),
        ("fragrantica_url",      "TEXT"),
        ("basenotes_url",        "TEXT"),
        ("custom_image_url",     "TEXT"),
        ("perfumer",             "TEXT"),
    ]
    for col, defn in new_columns:
        add_column(con, "fragrances", col, defn)

    print("\n── Creating new tables ──")

    con.executescript("""
    CREATE TABLE IF NOT EXISTS wear_log (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        fragrance_id    INTEGER NOT NULL REFERENCES fragrances(id) ON DELETE CASCADE,
        worn_date       TEXT NOT NULL,
        created_at      TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_wear_log_fragrance ON wear_log(fragrance_id);
    CREATE INDEX IF NOT EXISTS idx_wear_log_date ON wear_log(worn_date);

    CREATE TABLE IF NOT EXISTS wishlist (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        brand           TEXT NOT NULL,
        name            TEXT NOT NULL,
        concentration   TEXT,
        size_ml         REAL,
        notes           TEXT,
        priority        INTEGER DEFAULT 3,
        target_price    REAL,
        fragrantica_url TEXT,
        image_url       TEXT,
        top_notes       TEXT DEFAULT '[]',
        middle_notes    TEXT DEFAULT '[]',
        base_notes      TEXT DEFAULT '[]',
        main_accords    TEXT DEFAULT '[]',
        added_at        TEXT DEFAULT (datetime('now')),
        purchased_at    TEXT,
        is_purchased    INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS friend_invites (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        name            TEXT NOT NULL,
        email           TEXT,
        token           TEXT UNIQUE NOT NULL,
        created_at      TEXT DEFAULT (datetime('now')),
        last_seen       TEXT,
        is_active       INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS sample_requests (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        friend_id       INTEGER REFERENCES friend_invites(id) ON DELETE SET NULL,
        friend_name     TEXT,
        fragrance_ids   TEXT NOT NULL,
        fragrance_names TEXT,
        message         TEXT,
        status          TEXT DEFAULT 'pending',
        created_at      TEXT DEFAULT (datetime('now')),
        updated_at      TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS enrichment_cache (
        cache_key       TEXT PRIMARY KEY,
        fragrantica_url TEXT,
        raw_data        TEXT,
        cached_at       TEXT DEFAULT (datetime('now')),
        expires_at      TEXT
    );

    CREATE TABLE IF NOT EXISTS fragrance_notes (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        fragrance_id    INTEGER NOT NULL REFERENCES fragrances(id) ON DELETE CASCADE,
        note_name       TEXT NOT NULL,
        note_position   TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_fragrance_notes_frag ON fragrance_notes(fragrance_id);
    CREATE INDEX IF NOT EXISTS idx_fragrance_notes_name ON fragrance_notes(note_name);

    CREATE TABLE IF NOT EXISTS houses (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        name            TEXT UNIQUE NOT NULL,
        country         TEXT,
        founded_year    INTEGER,
        founder         TEXT,
        description     TEXT,
        website         TEXT,
        fragrantica_url TEXT,
        image_url       TEXT,
        manually_edited INTEGER DEFAULT 0,
        created_at      TEXT DEFAULT (datetime('now')),
        updated_at      TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS perfumers (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        name            TEXT UNIQUE NOT NULL,
        nationality     TEXT,
        birth_year      INTEGER,
        bio             TEXT,
        image_url       TEXT,
        fragrantica_url TEXT,
        created_at      TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
        key             TEXT PRIMARY KEY,
        value           TEXT,
        updated_at      TEXT DEFAULT (datetime('now'))
    );
    """)

    # Default settings
    defaults = [
        ('rotation_challenge_enabled', '0'),
        ('collector_rank_enabled', '0'),
        ('blind_spot_challenge_enabled', '0'),
        ('volume_tracker_enabled', '0'),
        ('wear_streak_enabled', '0'),
        ('public_collection_enabled', '0'),
        ('public_collection_slug', 'adam'),
        ('owner_name', 'Adam'),
        ('collection_title', 'My Fragrance Collection'),
        ('weather_auto_detect', '1'),
        ('default_sort', 'brand_name'),
        ('theme', 'dark'),
    ]
    for key, value in defaults:
        con.execute(
            "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
            (key, value)
        )

    con.commit()
    con.close()

    print("\n── Verification ──")
    con = sqlite3.connect(DB_PATH)
    tables = [r[0] for r in con.execute(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).fetchall()]
    print(f"  Tables: {', '.join(tables)}")
    frag_count = con.execute("SELECT COUNT(*) FROM fragrances").fetchone()[0]
    enriched   = con.execute("SELECT COUNT(*) FROM fragrances WHERE enrichment_status='success'").fetchone()[0]
    print(f"  Fragrances: {frag_count} total, {enriched} enriched")
    con.close()

    print("\n✓ Migration complete!\n")

if __name__ == "__main__":
    main()
