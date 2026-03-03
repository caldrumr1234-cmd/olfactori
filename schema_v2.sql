-- ============================================================
-- Olfactori — schema_v2.sql
-- Run this to upgrade your existing database with all new tables
-- Usage: python -c "import sqlite3; con=sqlite3.connect('data/sillage.db'); con.executescript(open('schema_v2.sql').read()); print('Done')"
-- ============================================================

-- ── UPGRADE FRAGRANCES TABLE ─────────────────────────────────
-- Add new columns to existing fragrances table (safe to run multiple times)
ALTER TABLE fragrances ADD COLUMN IF NOT EXISTS enrichment_source TEXT DEFAULT 'fragella';
ALTER TABLE fragrances ADD COLUMN IF NOT EXISTS fragella_image_url TEXT;
ALTER TABLE fragrances ADD COLUMN IF NOT EXISTS season_tags TEXT DEFAULT '[]';
ALTER TABLE fragrances ADD COLUMN IF NOT EXISTS occasion_tags TEXT DEFAULT '[]';
ALTER TABLE fragrances ADD COLUMN IF NOT EXISTS manually_edited INTEGER DEFAULT 0;
ALTER TABLE fragrances ADD COLUMN IF NOT EXISTS enrichment_locked INTEGER DEFAULT 0;
ALTER TABLE fragrances ADD COLUMN IF NOT EXISTS override_fields TEXT DEFAULT '{}';
ALTER TABLE fragrances ADD COLUMN IF NOT EXISTS personal_rating REAL;
ALTER TABLE fragrances ADD COLUMN IF NOT EXISTS purchase_price REAL;
ALTER TABLE fragrances ADD COLUMN IF NOT EXISTS purchase_date TEXT;
ALTER TABLE fragrances ADD COLUMN IF NOT EXISTS purchase_url TEXT;
ALTER TABLE fragrances ADD COLUMN IF NOT EXISTS current_market_price REAL;
ALTER TABLE fragrances ADD COLUMN IF NOT EXISTS bottle_percentage REAL DEFAULT 100.0;
ALTER TABLE fragrances ADD COLUMN IF NOT EXISTS decant_available INTEGER DEFAULT 0;
ALTER TABLE fragrances ADD COLUMN IF NOT EXISTS decant_size_ml REAL;
ALTER TABLE fragrances ADD COLUMN IF NOT EXISTS reformulation_notes TEXT;
ALTER TABLE fragrances ADD COLUMN IF NOT EXISTS is_reformulated INTEGER DEFAULT 0;
ALTER TABLE fragrances ADD COLUMN IF NOT EXISTS country_of_origin TEXT;
ALTER TABLE fragrances ADD COLUMN IF NOT EXISTS fragrantica_url TEXT;
ALTER TABLE fragrances ADD COLUMN IF NOT EXISTS basenotes_url TEXT;
ALTER TABLE fragrances ADD COLUMN IF NOT EXISTS custom_image_url TEXT;
ALTER TABLE fragrances ADD COLUMN IF NOT EXISTS house_founded INTEGER;
ALTER TABLE fragrances ADD COLUMN IF NOT EXISTS perfumer TEXT;

-- ── WEAR LOG ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wear_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    fragrance_id    INTEGER NOT NULL REFERENCES fragrances(id) ON DELETE CASCADE,
    worn_date       TEXT NOT NULL,
    created_at      TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wear_log_fragrance ON wear_log(fragrance_id);
CREATE INDEX IF NOT EXISTS idx_wear_log_date ON wear_log(worn_date);

-- ── WISHLIST ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wishlist (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    brand           TEXT NOT NULL,
    name            TEXT NOT NULL,
    concentration   TEXT,
    size_ml         REAL,
    notes           TEXT,
    priority        INTEGER DEFAULT 3,   -- 1=high, 2=med, 3=low
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

-- ── FRIEND INVITES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS friend_invites (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    email           TEXT,
    token           TEXT UNIQUE NOT NULL,
    created_at      TEXT DEFAULT (datetime('now')),
    last_seen       TEXT,
    is_active       INTEGER DEFAULT 1
);

-- ── SAMPLE REQUESTS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sample_requests (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    friend_id       INTEGER REFERENCES friend_invites(id) ON DELETE SET NULL,
    friend_name     TEXT,
    fragrance_ids   TEXT NOT NULL,   -- JSON array of fragrance IDs
    fragrance_names TEXT,            -- JSON array of "Brand - Name" for display
    message         TEXT,
    status          TEXT DEFAULT 'pending',  -- pending / sent / declined
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
);

-- ── ENRICHMENT CACHE ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS enrichment_cache (
    cache_key       TEXT PRIMARY KEY,
    fragrantica_url TEXT,
    raw_data        TEXT,
    cached_at       TEXT DEFAULT (datetime('now')),
    expires_at      TEXT
);

-- ── FRAGRANCE NOTES LOOKUP ────────────────────────────────────
CREATE TABLE IF NOT EXISTS fragrance_notes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    fragrance_id    INTEGER NOT NULL REFERENCES fragrances(id) ON DELETE CASCADE,
    note_name       TEXT NOT NULL,
    note_position   TEXT NOT NULL   -- top / middle / base / accord
);

CREATE INDEX IF NOT EXISTS idx_fragrance_notes_frag ON fragrance_notes(fragrance_id);
CREATE INDEX IF NOT EXISTS idx_fragrance_notes_name ON fragrance_notes(note_name);

-- ── HOUSE PROFILES ────────────────────────────────────────────
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

-- ── PERFUMER PROFILES ─────────────────────────────────────────
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

-- ── APP SETTINGS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
    key             TEXT PRIMARY KEY,
    value           TEXT,
    updated_at      TEXT DEFAULT (datetime('now'))
);

-- Default settings
INSERT OR IGNORE INTO settings (key, value) VALUES
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
    ('theme', 'dark');
