"""
enrichment.py
=============
Enriches fragrances using the Fragella API (api.fragella.com).
Clean JSON responses — no scraping, no URL hunting, no rate limit failures.
"""

import json
import time
import logging
import sqlite3
import hashlib
from pathlib import Path
from datetime import datetime, timedelta

import httpx
from rapidfuzz import fuzz

log = logging.getLogger(__name__)

# ── CONFIG ────────────────────────────────────────────────────
DB_PATH           = Path("data/sillage.db")
FRAGELLA_API_KEY  = "80a84a7186a18cf309b88e6927a1adc667d9e01bc25a13ee44612c59087da198"
FRAGELLA_BASE     = "https://api.fragella.com/api/v1"
REQUEST_DELAY     = 0.5
FUZZY_THRESHOLD   = 60
CACHE_EXPIRE_DAYS = 30

HEADERS = {"x-api-key": FRAGELLA_API_KEY}


# ── CACHE ─────────────────────────────────────────────────────
def _cache_key(brand, name):
    return hashlib.md5(f"{brand.lower().strip()}|{name.lower().strip()}".encode()).hexdigest()


def cache_get(con, brand, name):
    row = con.execute(
        "SELECT raw_data, expires_at FROM enrichment_cache WHERE cache_key = ?",
        (_cache_key(brand, name),)
    ).fetchone()
    if not row:
        return None
    if row["expires_at"] and datetime.fromisoformat(row["expires_at"]) < datetime.now():
        return None
    return json.loads(row["raw_data"])


def cache_set(con, brand, name, data):
    expires = (datetime.now() + timedelta(days=CACHE_EXPIRE_DAYS)).isoformat()
    con.execute(
        "INSERT OR REPLACE INTO enrichment_cache (cache_key, raw_data, cached_at, expires_at) VALUES (?,?,datetime('now'),?)",
        (_cache_key(brand, name), json.dumps(data), expires)
    )
    con.commit()


# ── FRAGELLA API ──────────────────────────────────────────────
def api_search(brand, name, client):
    """Search Fragella, return best fuzzy-matched result or None."""
    query = f"{brand} {name}"
    try:
        resp = client.get(
            f"{FRAGELLA_BASE}/fragrances",
            headers=HEADERS,
            params={"search": query, "limit": 5},
            timeout=15
        )
        if resp.status_code == 401:
            log.error("Fragella API key rejected — check FRAGELLA_API_KEY")
            return None
        if resp.status_code == 429:
            log.warning("Rate limited — waiting 10s")
            time.sleep(10)
            return None
        if resp.status_code != 200:
            log.warning(f"HTTP {resp.status_code} for '{query}'")
            return None

        results = resp.json()
        if not results:
            log.warning(f"No Fragella results for '{query}'")
            return None

        target = f"{brand} {name}".lower()
        best, best_score = None, 0
        for item in results:
            candidate = f"{item.get('Brand', '')} {item.get('Name', '')}".lower()
            score = fuzz.token_set_ratio(target, candidate)
            if score > best_score:
                best_score = score
                best = item

        if best_score < FUZZY_THRESHOLD:
            log.warning(f"Weak match ({best_score}) for '{query}' — skipping")
            return None

        log.debug(f"'{query}' matched '{best.get('Brand')} {best.get('Name')}' score={best_score}")
        return best

    except Exception as e:
        log.error(f"API error for '{query}': {e}")
        return None


# ── NORMALIZER ────────────────────────────────────────────────
def normalize(raw, brand, name):
    """Convert Fragella response dict to our DB schema dict."""

    # Notes pyramid
    notes_obj    = raw.get("Notes", {})
    top_notes    = [n["name"] for n in notes_obj.get("Top", [])    if isinstance(n, dict) and "name" in n]
    middle_notes = [n["name"] for n in notes_obj.get("Middle", []) if isinstance(n, dict) and "name" in n]
    base_notes   = [n["name"] for n in notes_obj.get("Base", [])   if isinstance(n, dict) and "name" in n]
    if not any([top_notes, middle_notes, base_notes]):
        top_notes = [n for n in raw.get("General Notes", []) if isinstance(n, str)]

    # Accords
    accords = raw.get("Main Accords", [])
    if isinstance(accords, str):
        accords = [a.strip() for a in accords.split(",")]
    accords = [a for a in accords if isinstance(a, str)]

    # Seasons — Fragella: [{"spring": 2.3}, {"summer": 1.1}, ...]
    def parse_ranking(ranking_list, top_n=2):
        items = []
        for entry in (ranking_list or []):
            if not isinstance(entry, dict):
                continue
            for k, v in entry.items():
                try:
                    items.append((k.title(), float(v)))
                except (ValueError, TypeError):
                    pass
        items.sort(key=lambda x: x[1], reverse=True)
        return [label for label, _ in items[:top_n]]

    seasons   = parse_ranking(raw.get("Season Ranking", []))
    occasions = parse_ranking(raw.get("Occasion Ranking", []))

    # Concentration
    oil = (raw.get("OilType") or "").lower().strip()
    conc_map = {
        "eau de parfum": "EdP", "edp": "EdP",
        "eau de toilette": "EdT", "edt": "EdT",
        "extrait de parfum": "Extrait", "extrait": "Extrait",
        "parfum": "Parfum", "eau de cologne": "EdC",
        "edc": "EdC", "cologne": "EdC",
    }
    concentration = conc_map.get(oil) or (raw.get("OilType") or None)

    # Rating
    try:
        rating = float(raw.get("rating")) if raw.get("rating") else None
    except (ValueError, TypeError):
        rating = None

    # Longevity / Sillage — text labels or percentage strings
    def parse_ls(val):
        if val is None:
            return None
        if isinstance(val, (int, float)):
            return float(val)
        s = str(val)
        if "%" in s:
            try:
                return round(float(s.replace("%", "").strip()) / 20, 2)
            except ValueError:
                return None
        label_map = {
            "very weak": 1.0, "weak": 1.5, "poor": 1.5, "moderate": 2.5,
            "long lasting": 3.5, "long-lasting": 3.5, "strong": 3.5,
            "very long lasting": 4.5, "eternal": 5.0, "enormous": 4.5,
        }
        return label_map.get(s.lower().strip())

    # Year
    try:
        year = int(raw.get("Year")) if raw.get("Year") else None
    except (ValueError, TypeError):
        year = None

    # Gender
    gender_raw = (raw.get("Gender") or "").lower()
    gender = {"men": "Male", "women": "Female", "unisex": "Unisex",
              "male": "Male", "female": "Female"}.get(gender_raw)

    return {
        "year_released":      year,
        "concentration":      concentration,
        "gender_class":       gender,
        "fragrantica_rating": rating,
        "longevity_rating":   parse_ls(raw.get("Longevity")),
        "sillage_rating":     parse_ls(raw.get("Sillage")),
        "fragella_image_url": raw.get("Image URL"),
        "top_notes":          top_notes,
        "middle_notes":       middle_notes,
        "base_notes":         base_notes,
        "main_accords":       accords,
        "season_tags":        seasons,
        "occasion_tags":      occasions,
    }


# ── DB WRITE ──────────────────────────────────────────────────
def write_enrichment(con, fragrance_id, data):
    con.execute("""
        UPDATE fragrances SET
            year_released      = COALESCE(?, year_released),
            concentration      = COALESCE(?, concentration),
            gender_class       = COALESCE(?, gender_class),
            fragrantica_rating = COALESCE(?, fragrantica_rating),
            longevity_rating   = COALESCE(?, longevity_rating),
            sillage_rating     = COALESCE(?, sillage_rating),
            top_notes          = ?,
            middle_notes       = ?,
            base_notes         = ?,
            main_accords       = ?,
            season_tags        = ?,
            occasion_tags      = ?,
            enriched_at        = datetime('now'),
            enrichment_source  = 'fragella',
            enrichment_status  = 'success'
        WHERE id = ?
    """, (
        data.get("year_released"),
        data.get("concentration"),
        data.get("gender_class"),
        data.get("fragrantica_rating"),
        data.get("longevity_rating"),
        data.get("sillage_rating"),
        json.dumps(data.get("top_notes", [])),
        json.dumps(data.get("middle_notes", [])),
        json.dumps(data.get("base_notes", [])),
        json.dumps(data.get("main_accords", [])),
        json.dumps(data.get("season_tags", [])),
        json.dumps(data.get("occasion_tags", [])),
        fragrance_id,
    ))

    # Rebuild notes lookup table
    con.execute("DELETE FROM fragrance_notes WHERE fragrance_id = ?", (fragrance_id,))
    rows = []
    for pos, lst in [("top", data.get("top_notes", [])),
                     ("middle", data.get("middle_notes", [])),
                     ("base", data.get("base_notes", [])),
                     ("accord", data.get("main_accords", []))]:
        for note in lst:
            if note:
                rows.append((fragrance_id, note, pos))
    if rows:
        con.executemany(
            "INSERT INTO fragrance_notes (fragrance_id, note_name, note_position) VALUES (?,?,?)",
            rows
        )
    con.commit()


def mark_failed(con, fragrance_id):
    con.execute(
        "UPDATE fragrances SET enrichment_status='failed', enriched_at=datetime('now') WHERE id=?",
        (fragrance_id,)
    )
    con.commit()


# ── ENRICH ONE ────────────────────────────────────────────────
def enrich_one(con, frag, client, force=False):
    frag_id = frag["id"]
    brand   = frag["brand"]
    name    = frag["name"]

    if not force and frag["enrichment_status"] == "success":
        log.debug(f"Already enriched: {brand} — {name}")
        return True

    log.info(f"  Enriching: {brand} — {name}")

    cached = cache_get(con, brand, name)
    if cached and not force:
        log.info(f"  Cache hit: {brand} — {name}")
        write_enrichment(con, frag_id, cached)
        return True

    time.sleep(REQUEST_DELAY)

    raw = api_search(brand, name, client)
    if not raw:
        mark_failed(con, frag_id)
        return False

    data = normalize(raw, brand, name)
    cache_set(con, brand, name, data)
    write_enrichment(con, frag_id, data)

    note_count = sum(len(data.get(k, [])) for k in ["top_notes", "middle_notes", "base_notes"])
    log.info(f"  ✓ {brand} — {name} | year={data.get('year_released')} notes={note_count} accords={len(data.get('main_accords', []))}")
    return True


# ── PUBLIC FUNCTIONS ──────────────────────────────────────────
def enrich_all(db_path=DB_PATH, limit=None, force=False, status_filter="pending"):
    con = sqlite3.connect(db_path)
    con.row_factory = sqlite3.Row

    q = "SELECT * FROM fragrances"
    if not force:
        if status_filter == "failed":
            q += " WHERE enrichment_status = 'failed'"
        elif status_filter != "all":
            q += " WHERE enrichment_status IN ('pending', 'failed')"
    if limit:
        q += f" LIMIT {limit}"

    frags = con.execute(q).fetchall()
    log.info(f"Enriching {len(frags)} fragrances via Fragella API...")

    success, failed = 0, 0
    with httpx.Client() as client:
        for frag in frags:
            ok = enrich_one(con, frag, client, force=force)
            success += ok
            failed  += not ok

    con.close()
    log.info(f"Done — {success} enriched, {failed} failed")
    return success, failed


def enrich_single(brand, name, db_path=DB_PATH, force=True):
    con = sqlite3.connect(db_path)
    con.row_factory = sqlite3.Row
    frag = con.execute(
        "SELECT * FROM fragrances WHERE brand=? AND name=?", (brand, name)
    ).fetchone()
    if not frag:
        log.error(f"Not in DB: {brand} — {name}")
        con.close()
        return None
    with httpx.Client() as client:
        ok = enrich_one(con, frag, client, force=force)
    result = con.execute("SELECT * FROM fragrances WHERE id=?", (frag["id"],)).fetchone()
    con.close()
    return dict(result) if ok and result else None
