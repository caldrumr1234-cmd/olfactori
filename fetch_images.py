"""
fetch_images.py — Pull bottle image URLs from Fragella for all enriched fragrances.
Run: python fetch_images.py

Uses 3s delay between requests to stay within rate limits.
Safe to re-run — skips fragrances that already have an image.
"""
import sqlite3
import httpx
import time
from pathlib import Path
from rapidfuzz import fuzz

DB_PATH      = Path("data/sillage.db")
FRAGELLA_KEY = "80a84a7186a18cf309b88e6927a1adc667d9e01bc25a13ee44612c59087da198"
API_BASE     = "https://api.fragella.com/api/v1"
DELAY        = 3.0

def main():
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row

    rows = con.execute("""
        SELECT id, brand, name FROM fragrances
        WHERE enrichment_status = 'success'
          AND (fragella_image_url IS NULL OR fragella_image_url = '')
        ORDER BY brand, name
    """).fetchall()

    print(f"Fetching images for {len(rows)} fragrances...\n")

    found = 0
    not_found = 0
    errors = 0

    for i, row in enumerate(rows):
        fid   = row["id"]
        brand = row["brand"]
        name  = row["name"]
        query = f"{brand} {name}"

        try:
            resp = httpx.get(
                f"{API_BASE}/fragrances",
                headers={"x-api-key": FRAGELLA_KEY},
                params={"search": query, "limit": 5},
                timeout=15
            )

            if resp.status_code == 429:
                print(f"  ⚠ Rate limited — waiting 60s...")
                time.sleep(60)
                continue

            if resp.status_code != 200:
                print(f"  ✗ [{i+1}/{len(rows)}] {brand} — {name}: HTTP {resp.status_code}")
                errors += 1
                time.sleep(DELAY)
                continue

            results = resp.json()
            if not results:
                print(f"  ~ [{i+1}/{len(rows)}] {brand} — {name}: no results")
                not_found += 1
                time.sleep(DELAY)
                continue

            # Fuzzy match
            target = query.lower()
            best, best_score = None, 0
            for item in results:
                candidate = f"{item.get('Brand','')} {item.get('Name','')}".lower()
                score = fuzz.token_set_ratio(target, candidate)
                if score > best_score:
                    best_score = score
                    best = item

            if best_score < 60 or not best:
                print(f"  ~ [{i+1}/{len(rows)}] {brand} — {name}: no confident match ({best_score})")
                not_found += 1
                time.sleep(DELAY)
                continue

            # Extract image URL — try multiple field names Fragella uses
            img_url = (
                best.get("Image URL") or
                best.get("ImageUrl") or
                best.get("image_url") or
                None
            )

            if img_url:
                con.execute(
                    "UPDATE fragrances SET fragella_image_url = ? WHERE id = ?",
                    (img_url, fid)
                )
                con.commit()
                found += 1
                print(f"  ✓ [{i+1}/{len(rows)}] {brand} — {name}")
            else:
                # Print available keys so we can see what Fragella actually returns
                if i < 3:
                    print(f"  ? [{i+1}/{len(rows)}] {brand} — {name}: matched but no image key. Keys: {list(best.keys())}")
                else:
                    print(f"  ? [{i+1}/{len(rows)}] {brand} — {name}: matched but no image")
                not_found += 1

        except Exception as e:
            print(f"  ✗ [{i+1}/{len(rows)}] {brand} — {name}: {e}")
            errors += 1

        time.sleep(DELAY)

    con.close()
    print(f"\n── Done ──")
    print(f"  Found:     {found}")
    print(f"  Not found: {not_found}")
    print(f"  Errors:    {errors}")

if __name__ == "__main__":
    main()
