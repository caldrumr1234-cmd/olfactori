-- =============================================================
-- SILLAGE — Fragrance Collection Database Schema
-- =============================================================

PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- -------------------------------------------------------------
-- FRAGRANCES — core table, one row per bottle
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fragrances (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,

    -- === FROM YOUR GOOGLE SHEET ===
    brand               TEXT NOT NULL,
    name                TEXT NOT NULL,
    size_raw            TEXT,               -- original string e.g. "100ml", "3.4oz"
    size_ml             REAL,               -- normalized to ml

    -- parsed from your Notes column
    is_discontinued     INTEGER DEFAULT 0,  -- 0/1 boolean
    is_exclusive        INTEGER DEFAULT 0,
    exclusive_type      TEXT,               -- 'boutique', 'travel', 'retailer', etc.
    is_limited_edition  INTEGER DEFAULT 0,
    is_tester           INTEGER DEFAULT 0,
    condition_notes     TEXT,               -- "no cap", "no box", etc.
    personal_notes      TEXT,               -- any leftover free-text from Notes

    -- === ENRICHED FROM FRAGRANTICA ===
    perfumer            TEXT,               -- comma-separated if multiple
    year_released       INTEGER,
    concentration       TEXT,               -- EdP, EdT, Extrait, Cologne, etc.
    gender_class        TEXT,               -- Male, Female, Unisex
    fragrantica_id      TEXT,               -- fragrantica internal ID if extractable
    fragrantica_url     TEXT,
    fragrantica_rating  REAL,               -- out of 5
    fragrantica_votes   INTEGER,
    longevity_rating    REAL,               -- community avg 1-5
    sillage_rating      REAL,               -- community avg 1-5
    price_value_rating  REAL,

    -- notes stored as JSON arrays for flexibility
    top_notes           TEXT DEFAULT '[]',  -- JSON array of strings
    middle_notes        TEXT DEFAULT '[]',
    base_notes          TEXT DEFAULT '[]',
    main_accords        TEXT DEFAULT '[]',  -- e.g. ["Woody","Spicy","Amber"]

    -- tags
    season_tags         TEXT DEFAULT '[]',  -- ["Spring","Fall"]
    occasion_tags       TEXT DEFAULT '[]',  -- ["Evening","Work"]
    similar_frags       TEXT DEFAULT '[]',  -- [{id, name, brand}] from Fragrantica

    -- === USER DATA ===
    personal_rating     INTEGER CHECK(personal_rating BETWEEN 1 AND 5),
    last_worn           TEXT,               -- ISO date string YYYY-MM-DD
    wishlist            INTEGER DEFAULT 0,  -- 0/1
    wishlist_notes      TEXT,

    -- === META ===
    enriched_at         TEXT,               -- ISO datetime of last enrichment
    enrichment_source   TEXT DEFAULT 'fragrantica',
    enrichment_status   TEXT DEFAULT 'pending', -- pending | success | failed | skipped
    created_at          TEXT DEFAULT (datetime('now')),
    updated_at          TEXT DEFAULT (datetime('now'))
);

-- -------------------------------------------------------------
-- WEAR LOG — tracks each time a fragrance is worn
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wear_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    fragrance_id    INTEGER NOT NULL REFERENCES fragrances(id) ON DELETE CASCADE,
    worn_date       TEXT NOT NULL,          -- YYYY-MM-DD
    occasion        TEXT,                   -- optional: casual, work, evening, etc.
    weather         TEXT,                   -- optional: hot, cold, humid, dry
    notes           TEXT,                   -- optional personal note for that day
    created_at      TEXT DEFAULT (datetime('now'))
);

-- -------------------------------------------------------------
-- WISHLIST — separate tracking for want-to-try items
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wishlist (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    brand           TEXT NOT NULL,
    name            TEXT NOT NULL,
    size_ml         REAL,
    concentration   TEXT,
    priority        INTEGER DEFAULT 3 CHECK(priority BETWEEN 1 AND 5),
    estimated_price REAL,
    source_url      TEXT,
    notes           TEXT,
    fragrantica_url TEXT,
    -- enrichment fields (same subset as main table)
    top_notes       TEXT DEFAULT '[]',
    middle_notes    TEXT DEFAULT '[]',
    base_notes      TEXT DEFAULT '[]',
    main_accords    TEXT DEFAULT '[]',
    enrichment_status TEXT DEFAULT 'pending',
    created_at      TEXT DEFAULT (datetime('now'))
);

-- -------------------------------------------------------------
-- NOTES LOOKUP — flat table for fast note-based queries
-- (denormalized from the JSON arrays for search performance)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fragrance_notes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    fragrance_id    INTEGER NOT NULL REFERENCES fragrances(id) ON DELETE CASCADE,
    note_name       TEXT NOT NULL,
    note_position   TEXT NOT NULL CHECK(note_position IN ('top','middle','base','accord'))
);

-- -------------------------------------------------------------
-- ENRICHMENT CACHE — avoid re-scraping the same page
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enrichment_cache (
    cache_key       TEXT PRIMARY KEY,       -- "brand|name" normalized
    fragrantica_url TEXT,
    raw_data        TEXT,                   -- full JSON of scraped data
    cached_at       TEXT DEFAULT (datetime('now')),
    expires_at      TEXT                    -- datetime, NULL = never expires
);

-- -------------------------------------------------------------
-- INDEXES
-- -------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_fragrances_brand       ON fragrances(brand);
CREATE INDEX IF NOT EXISTS idx_fragrances_name        ON fragrances(name);
CREATE INDEX IF NOT EXISTS idx_fragrances_status      ON fragrances(enrichment_status);
CREATE INDEX IF NOT EXISTS idx_fragrance_notes_name   ON fragrance_notes(note_name);
CREATE INDEX IF NOT EXISTS idx_fragrance_notes_frag   ON fragrance_notes(fragrance_id);
CREATE INDEX IF NOT EXISTS idx_wear_log_frag          ON wear_log(fragrance_id);
CREATE INDEX IF NOT EXISTS idx_wear_log_date          ON wear_log(worn_date);

-- -------------------------------------------------------------
-- TRIGGER — auto-update updated_at on fragrances
-- -------------------------------------------------------------
CREATE TRIGGER IF NOT EXISTS fragrances_updated_at
    AFTER UPDATE ON fragrances
    BEGIN
        UPDATE fragrances SET updated_at = datetime('now') WHERE id = NEW.id;
    END;
