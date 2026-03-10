"""
Migration v2: adds tables/columns for:
  1. sent_samples      (previously-sent samples tracking)
  2. decants.volume_remaining_ml  (volume tracking)
  3. shelves + shelf_fragrances   (custom shelves/groupings)
"""
import sqlite3, os, sys

DB_PATH = os.environ.get("DB_PATH", "data/sillage.db")

def migrate(db_path):
    con = sqlite3.connect(db_path, check_same_thread=False)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA foreign_keys=ON")

    print(f"Migrating: {db_path}")

    # ── 1. sent_samples ────────────────────────────────────────────────────────
    con.execute("""
        CREATE TABLE IF NOT EXISTS sent_samples (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            fragrance_id    INTEGER NOT NULL,
            friend_name     TEXT NOT NULL,
            friend_email    TEXT,
            notes           TEXT,
            sent_at         TEXT NOT NULL DEFAULT (date('now'))
        )
    """)
    print("  ✓ sent_samples table ready")

    # ── 2. decants volume column ────────────────────────────────────────────────
    existing_cols = [row[1] for row in con.execute("PRAGMA table_info(decants)")]
    if "volume_remaining_ml" not in existing_cols:
        con.execute("ALTER TABLE decants ADD COLUMN volume_remaining_ml REAL")
        print("  ✓ decants.volume_remaining_ml column added")
    else:
        print("  – decants.volume_remaining_ml already exists, skipping")

    # ── 3. shelves + shelf_fragrances ──────────────────────────────────────────
    con.execute("""
        CREATE TABLE IF NOT EXISTS shelves (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT NOT NULL,
            color       TEXT NOT NULL DEFAULT '#7aabff',
            icon        TEXT NOT NULL DEFAULT '🧴',
            sort_order  INTEGER NOT NULL DEFAULT 0,
            created_at  TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)
    # Add sort_order if table existed without it
    existing_shelf_cols = [row[1] for row in con.execute("PRAGMA table_info(shelves)")]
    if "sort_order" not in existing_shelf_cols:
        con.execute("ALTER TABLE shelves ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0")
        print("  ✓ shelves.sort_order column added")
    print("  ✓ shelves table ready")

    con.execute("""
        CREATE TABLE IF NOT EXISTS shelf_fragrances (
            shelf_id        INTEGER NOT NULL REFERENCES shelves(id) ON DELETE CASCADE,
            fragrance_id    INTEGER NOT NULL,
            sort_order      INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (shelf_id, fragrance_id)
        )
    """)
    print("  ✓ shelf_fragrances table ready")

    con.commit()
    con.close()
    print("Migration complete.")

if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else DB_PATH
    migrate(path)
