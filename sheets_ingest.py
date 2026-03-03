"""
sheets_ingest.py
================
Pulls your Google Sheet → parses + normalizes each row → loads into SQLite.

Usage:
    python sheets_ingest.py                  # full sync
    python sheets_ingest.py --dry-run        # preview without writing
    python sheets_ingest.py --reset          # drop + reload all rows
"""

import re
import json
import sqlite3
import argparse
import logging
from datetime import datetime
from pathlib import Path

# Google Sheets imports — requires gspread + oauth2client
try:
    import gspread
    from google.oauth2.service_account import Credentials
    GSPREAD_AVAILABLE = True
except ImportError:
    GSPREAD_AVAILABLE = False

# ── CONFIG ────────────────────────────────────────────────────
CREDENTIALS_FILE = Path("credentials.json")   # your Google service account JSON
SHEET_NAME       = "Fragrance List"            # exact name of your Google Sheet
WORKSHEET_INDEX  = 0                          # 0 = first tab
DB_PATH          = Path("data/sillage.db")

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
log = logging.getLogger(__name__)

# ── SIZE NORMALIZATION ────────────────────────────────────────
def parse_size_to_ml(raw: str) -> float | None:
    """Convert '100ml', '3.4oz', '1.7 fl oz', '170 ml' → float ml."""
    if not raw:
        return None
    raw = str(raw).strip().lower()
    # ml
    m = re.search(r"([\d.]+)\s*ml", raw)
    if m:
        return float(m.group(1))
    # oz → ml (1 fl oz = 29.5735 ml)
    m = re.search(r"([\d.]+)\s*(?:fl\.?\s*)?oz", raw)
    if m:
        return round(float(m.group(1)) * 29.5735, 1)
    # bare number — assume ml
    m = re.match(r"^([\d.]+)$", raw)
    if m:
        return float(m.group(1))
    return None


# ── NOTES COLUMN PARSER ───────────────────────────────────────
# Keywords → structured fields
DISCONTINUED_KEYWORDS  = ["discontinued", "disc.", "disc'd", "no longer made", "reformulated"]
EXCLUSIVE_KEYWORDS     = {
    "boutique exclusive": "boutique",
    "boutique excl":      "boutique",
    "travel exclusive":   "travel",
    "travel excl":        "travel",
    "retailer exclusive": "retailer",
    "exclusive":          "general",
}
LIMITED_KEYWORDS       = ["limited edition", "limited ed", "le ", "limited"]
TESTER_KEYWORDS        = ["tester"]
CONDITION_KEYWORDS     = ["no cap", "missing cap", "no box", "missing box",
                           "damaged box", "no cellophane", "bottle only"]

def parse_notes_column(raw: str) -> dict:
    """
    Parse the free-text Notes column into structured fields.
    Returns a dict of parsed values; unmatched text goes to personal_notes.
    """
    if not raw:
        return {}

    result = {
        "is_discontinued":    False,
        "is_exclusive":       False,
        "exclusive_type":     None,
        "is_limited_edition": False,
        "is_tester":          False,
        "condition_notes":    None,
        "personal_notes":     None,
    }

    text = str(raw).strip()
    remaining = text.lower()

    # Discontinued
    for kw in DISCONTINUED_KEYWORDS:
        if kw in remaining:
            result["is_discontinued"] = True
            remaining = remaining.replace(kw, "")

    # Exclusive (check longer phrases first)
    for kw, etype in sorted(EXCLUSIVE_KEYWORDS.items(), key=lambda x: -len(x[0])):
        if kw in remaining:
            result["is_exclusive"] = True
            result["exclusive_type"] = etype
            remaining = remaining.replace(kw, "")
            break

    # Limited edition
    for kw in LIMITED_KEYWORDS:
        if kw in remaining:
            result["is_limited_edition"] = True
            remaining = remaining.replace(kw, "")
            break

    # Tester
    for kw in TESTER_KEYWORDS:
        if kw in remaining:
            result["is_tester"] = True
            remaining = remaining.replace(kw, "")

    # Condition notes
    found_conditions = []
    for kw in CONDITION_KEYWORDS:
        if kw in remaining:
            found_conditions.append(kw)
            remaining = remaining.replace(kw, "")
    if found_conditions:
        result["condition_notes"] = ", ".join(found_conditions)

    # Whatever is left goes to personal_notes
    leftover = re.sub(r"[-–,;/\s]+", " ", remaining).strip(" -–,;/")
    if leftover:
        result["personal_notes"] = leftover

    return result


# ── BRAND NORMALIZER ──────────────────────────────────────────
# Fixes common Google Sheets auto-format casualties
BRAND_FIXES = {
    "47114711": "4711",   # Sheets strips leading zeros / treats as number
    "4711.0":   "4711",
    "4711,0":   "4711",
}

def normalize_brand(raw: str) -> str:
    raw = str(raw).strip()
    return BRAND_FIXES.get(raw, raw)


# ── ROW PARSER ────────────────────────────────────────────────
def parse_row(row: dict) -> dict:
    """
    Takes a raw dict from gspread (keyed by header) and returns
    a clean dict ready for INSERT into the fragrances table.
    """
    brand     = normalize_brand(row.get("Brand", "") or "")
    name      = str(row.get("Fragrance", "") or "").strip()
    size_raw  = str(row.get("Size", "") or "").strip()
    notes_raw = str(row.get("Notes", "") or "").strip()

    if not brand or not name:
        return None  # skip empty rows

    parsed = {
        "brand":    brand,
        "name":     name,
        "size_raw": size_raw or None,
        "size_ml":  parse_size_to_ml(size_raw),
        **parse_notes_column(notes_raw),
    }
    return parsed


# ── DATABASE HELPERS ──────────────────────────────────────────
def get_db(db_path: Path) -> sqlite3.Connection:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(db_path)
    con.row_factory = sqlite3.Row
    # Apply schema if tables don't exist yet
    schema = Path("schema.sql").read_text()
    con.executescript(schema)
    con.commit()
    return con


def upsert_fragrance(con: sqlite3.Connection, data: dict, dry_run: bool = False) -> str:
    """
    Insert or update a fragrance row.
    Match on (brand, name) — update non-enriched fields only to avoid
    clobbering enrichment data that already exists.
    Returns 'inserted' | 'updated' | 'skipped'
    """
    cur = con.execute(
        "SELECT id, enrichment_status FROM fragrances WHERE brand = ? AND name = ?",
        (data["brand"], data["name"])
    )
    existing = cur.fetchone()

    if dry_run:
        action = "would update" if existing else "would insert"
        log.info(f"  {action}: {data['brand']} — {data['name']}")
        return action

    if existing:
        # Update only the sheet-sourced columns, preserve enrichment data
        con.execute("""
            UPDATE fragrances SET
                size_raw          = ?,
                size_ml           = ?,
                is_discontinued   = ?,
                is_exclusive      = ?,
                exclusive_type    = ?,
                is_limited_edition = ?,
                is_tester         = ?,
                condition_notes   = ?,
                personal_notes    = ?,
                updated_at        = datetime('now')
            WHERE brand = ? AND name = ?
        """, (
            data["size_raw"], data["size_ml"],
            int(data.get("is_discontinued", False)),
            int(data.get("is_exclusive", False)),
            data.get("exclusive_type"),
            int(data.get("is_limited_edition", False)),
            int(data.get("is_tester", False)),
            data.get("condition_notes"),
            data.get("personal_notes"),
            data["brand"], data["name"]
        ))
        return "updated"
    else:
        con.execute("""
            INSERT INTO fragrances (
                brand, name, size_raw, size_ml,
                is_discontinued, is_exclusive, exclusive_type,
                is_limited_edition, is_tester,
                condition_notes, personal_notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data["brand"], data["name"], data["size_raw"], data["size_ml"],
            int(data.get("is_discontinued", False)),
            int(data.get("is_exclusive", False)),
            data.get("exclusive_type"),
            int(data.get("is_limited_edition", False)),
            int(data.get("is_tester", False)),
            data.get("condition_notes"),
            data.get("personal_notes"),
        ))
        return "inserted"


# ── GOOGLE SHEETS FETCH ───────────────────────────────────────
def fetch_sheet_rows() -> list[dict]:
    """Connect to Google Sheets and return all rows as list of dicts."""
    if not GSPREAD_AVAILABLE:
        raise ImportError("Run: pip install gspread google-auth")

    if not CREDENTIALS_FILE.exists():
        raise FileNotFoundError(
            f"Missing {CREDENTIALS_FILE}\n"
            "See README.md → 'Google Credentials Setup' for instructions."
        )

    scopes = [
        "https://www.googleapis.com/auth/spreadsheets.readonly",
        "https://www.googleapis.com/auth/drive.readonly",
    ]
    creds  = Credentials.from_service_account_file(str(CREDENTIALS_FILE), scopes=scopes)
    client = gspread.authorize(creds)

    log.info(f"Opening sheet: '{SHEET_NAME}'")
    sheet     = client.open(SHEET_NAME)
    worksheet = sheet.get_worksheet(WORKSHEET_INDEX)
    rows      = worksheet.get_all_records(
        expected_headers=["Brand", "Fragrance", "Size", "Notes"]
    )
    log.info(f"Fetched {len(rows)} rows from Google Sheets")
    return rows


# ── DEMO MODE (no Google Sheets) ─────────────────────────────
DEMO_ROWS = [
    {"Brand": "47114711",      "Fragrance": "Acqua Colonia Intense Wakening Woods of Scandinavia", "Size": "170 ml",  "Notes": "Tester - No Cap"},
    {"Brand": "47114711",      "Fragrance": "Original Eau de Cologne",                              "Size": "399 ml",  "Notes": "Splash"},
    {"Brand": "47114711",      "Fragrance": "Remix Green Oasis",                                    "Size": "100 ml",  "Notes": "Limited Edition"},
    {"Brand": "Acqua di Parma","Fragrance": "Arancia di Capri",                                     "Size": "150 ml",  "Notes": ""},
    {"Brand": "Acqua di Parma","Fragrance": "Bergamotto di Calabria",                               "Size": "150 ml",  "Notes": ""},
    {"Brand": "Acqua di Parma","Fragrance": "Buongiorno",                                           "Size": "50 ml",   "Notes": ""},
    {"Brand": "Acqua di Parma","Fragrance": "Cipresso di Toscana",                                  "Size": "150 ml",  "Notes": "Discontinued"},
]


# ── MAIN ──────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Sync Google Sheets → Sillage DB")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing")
    parser.add_argument("--reset",   action="store_true", help="Drop all rows before reload")
    parser.add_argument("--demo",    action="store_true", help="Use built-in demo data (no Sheets needed)")
    args = parser.parse_args()

    # Fetch rows
    if args.demo or not CREDENTIALS_FILE.exists():
        if not args.demo:
            log.warning("credentials.json not found — running in demo mode")
        rows = DEMO_ROWS
        log.info(f"Using {len(rows)} demo rows")
    else:
        rows = fetch_sheet_rows()

    # Database
    con = get_db(DB_PATH)

    if args.reset and not args.dry_run:
        con.execute("DELETE FROM fragrances")
        con.commit()
        log.info("Cleared existing fragrance rows")

    # Process rows
    counts = {"inserted": 0, "updated": 0, "skipped": 0, "errors": 0}
    for raw_row in rows:
        try:
            parsed = parse_row(raw_row)
            if parsed is None:
                counts["skipped"] += 1
                continue
            action = upsert_fragrance(con, parsed, dry_run=args.dry_run)
            key = action.replace("would ", "")
            counts[key] = counts.get(key, 0) + 1
        except Exception as e:
            log.error(f"Error on row {raw_row}: {e}")
            counts["errors"] += 1

    if not args.dry_run:
        con.commit()

    con.close()

    log.info("─" * 50)
    log.info(f"  Inserted : {counts.get('inserted', 0)}")
    log.info(f"  Updated  : {counts.get('updated', 0)}")
    log.info(f"  Skipped  : {counts.get('skipped', 0)}")
    log.info(f"  Errors   : {counts.get('errors', 0)}")
    if args.dry_run:
        log.info("  (dry run — no changes written)")


if __name__ == "__main__":
    main()
