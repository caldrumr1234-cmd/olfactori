"""
enrich_fragrantica_local.py
===========================
Runs LOCALLY to scrape Fragrantica (bypasses Cloudflare) and push results
to the live Railway API.  Railway's server IP is blocked by Cloudflare;
your local machine is not.

Usage: python enrich_fragrantica_local.py
  --all         enrich every fragrance that has a fragrantica_url and missing fields
  --id 215      enrich a single fragrance by ID
  --force       re-scrape even if fields are already filled
"""
import argparse
import json
import sys
import time
import random
import re

import httpx
from bs4 import BeautifulSoup
from curl_cffi import requests as cffi_requests
from rapidfuzz import fuzz

# ── CONFIG ────────────────────────────────────────────────────
RAILWAY_API = "https://olfactori-production.up.railway.app/api"

# ── HTTP helpers ──────────────────────────────────────────────
def _delay():
    time.sleep(random.uniform(1.5, 3.0))

def _ft_get(url: str):
    """Fetch a Fragrantica page with Chrome TLS impersonation."""
    _delay()
    resp = cffi_requests.get(url, impersonate="chrome110", timeout=25)
    print(f"  [fragrantica] {resp.status_code}  {url}")
    return resp if resp.status_code == 200 else None

# ── FRAGRANTICA SCRAPER ───────────────────────────────────────
def scrape_fragrantica(url: str) -> dict:
    resp = _ft_get(url)
    if not resp:
        return {}
    soup = BeautifulSoup(resp.text, "lxml")
    result = {}

    # Notes pyramid — new layout uses <pyramid-level-new notes="top|middle|base">
    notes = {"top": [], "middle": [], "base": []}
    for pln in soup.find_all("pyramid-level-new"):
        tier  = pln.get("notes", "").lower()
        items = [s.get_text(strip=True) for s in pln.select(".pyramid-note-label") if s.get_text(strip=True)]
        if tier == "top":      notes["top"]    = items
        elif tier == "middle": notes["middle"] = items
        elif tier == "base":   notes["base"]   = items
    # Fallback: old layout
    if not any(notes.values()):
        for cell in soup.select(".cell.pyramid-cell"):
            label = cell.select_one("label, .notes-box label")
            if not label:
                continue
            lt = label.text.strip().lower()
            items = [el.get("alt", el.text.strip()) for el in cell.select("img[alt], span.cell-name") if el.get("alt", el.text.strip())]
            if "top" in lt:                           notes["top"]    = items
            elif "heart" in lt or "middle" in lt:     notes["middle"] = items
            elif "base" in lt:                        notes["base"]   = items
    if notes["top"]:    result["top_notes"]    = notes["top"]
    if notes["middle"]: result["middle_notes"] = notes["middle"]
    if notes["base"]:   result["base_notes"]   = notes["base"]

    # Accords
    h6 = soup.find("h6", string=re.compile(r"main accords", re.I))
    if h6:
        sib = h6.find_next_sibling()
        if sib:
            accords = [s.get_text(strip=True) for s in sib.select("span.truncate") if s.get_text(strip=True)]
            if accords:
                result["main_accords"] = accords
    if not result.get("main_accords"):
        accords = [a.text.strip() for a in soup.select(".cell.accord-box span") if a.text.strip()]
        if accords:
            result["main_accords"] = accords

    # Year
    _YEAR_RE = re.compile(r'\b(1[6-9]\d\d|20[0-2]\d)\b')
    _LAUNCH_RE = re.compile(
        r'(?:launched?|introduced?|debuted?|released?|created|since)\s+(?:in\s+)?(\b(?:1[6-9]\d\d|20[0-2]\d)\b)',
        re.IGNORECASE
    )
    for script in soup.select('script[type="application/ld+json"]'):
        try:
            ld = json.loads(script.string or "")
            for key in ("datePublished", "releaseDate", "copyrightYear"):
                val = ld.get(key)
                if val:
                    m = _YEAR_RE.search(str(val))
                    if m:
                        result["year_released"] = int(m.group())
                        break
            if result.get("year_released"):
                break
        except Exception:
            pass
    if not result.get("year_released"):
        for el in soup.select("p, .fragranceDescriptionText, div[class*='description']"):
            m = _LAUNCH_RE.search(el.get_text())
            if m:
                result["year_released"] = int(m.group(1))
                break
    if not result.get("year_released"):
        for el in soup.select("b, strong"):
            m = re.fullmatch(r'\s*(1[6-9]\d\d|20[0-2]\d)\s*', el.get_text())
            if m:
                result["year_released"] = int(m.group(1))
                break

    # Rating
    r_el = soup.select_one('[itemprop="ratingValue"]')
    if r_el:
        try:
            result["fragrantica_rating"] = float(r_el.text.strip())
        except (ValueError, TypeError):
            pass

    # Perfumer
    for a in soup.select('a[href*="/noses/"]'):
        if re.search(r"/noses/\w", a.get("href", "")):
            txt = a.get_text(strip=True)
            if txt:
                result["perfumer"] = txt
                break

    # Gender
    for el in soup.select("span[class*='teal'], small, .gender"):
        t = el.get_text(strip=True).lower()
        if "for women" in t and "men" in t:
            result["gender_class"] = "Unisex"; break
        elif "for women" in t:
            result["gender_class"] = "Female"; break
        elif "for men" in t:
            result["gender_class"] = "Male"; break

    return result

# ── RAILWAY API helpers ───────────────────────────────────────
def get_fragrances(limit=500):
    r = httpx.get(f"{RAILWAY_API}/fragrances", params={"limit": limit}, timeout=30)
    r.raise_for_status()
    return r.json().get("items", [])

def apply_enrichment(frag_id: int, data: dict):
    payload = {"data": data, "lock": False}
    r = httpx.post(f"{RAILWAY_API}/fragrances/{frag_id}/enrich/apply", json=payload, timeout=30)
    r.raise_for_status()
    return r.json()

# ── MISSING FIELDS CHECK ─────────────────────────────────────
ENRICHABLE = ["year_released", "gender_class", "perfumer", "top_notes",
              "middle_notes", "base_notes", "main_accords", "fragrantica_rating"]

def missing_fields(frag: dict) -> list[str]:
    return [f for f in ENRICHABLE if not frag.get(f)]

# ── MAIN ─────────────────────────────────────────────────────
def enrich_one(frag: dict, force: bool = False):
    frag_id   = frag["id"]
    label     = f"{frag['brand']} – {frag['name']}"
    ft_url    = frag.get("fragrantica_url")
    if not ft_url:
        print(f"  SKIP  {label} — no fragrantica_url stored")
        return

    if not force:
        missing = missing_fields(frag)
        if not missing:
            print(f"  SKIP  {label} — already complete")
            return
        print(f"  {label}  missing: {missing}")
    else:
        print(f"  {label}  (force re-scrape)")

    data = scrape_fragrantica(ft_url)
    if not data:
        print(f"  FAIL  {label} — scraper returned nothing")
        return

    # Only send fields that were missing (unless --force)
    if not force:
        data = {k: v for k, v in data.items() if k in missing_fields(frag)}

    if not data:
        print(f"  SKIP  {label} — nothing new to apply")
        return

    print(f"  applying: {list(data.keys())}")
    apply_enrichment(frag_id, data)
    print(f"  done")


def main():
    parser = argparse.ArgumentParser(description="Local Fragrantica enrichment for Olfactori")
    parser.add_argument("--all",   action="store_true", help="Enrich all fragrances with fragrantica_url")
    parser.add_argument("--id",    type=int,            help="Enrich a single fragrance by ID")
    parser.add_argument("--force", action="store_true", help="Re-scrape even if fields are already filled")
    args = parser.parse_args()

    if not args.all and not args.id:
        parser.print_help()
        sys.exit(1)

    print(f"Fetching fragrance list from Railway...")
    frags = get_fragrances()
    print(f"  {len(frags)} fragrances loaded\n")

    if args.id:
        matches = [f for f in frags if f["id"] == args.id]
        if not matches:
            print(f"ID {args.id} not found")
            sys.exit(1)
        enrich_one(matches[0], force=args.force)
    else:
        candidates = [f for f in frags if f.get("fragrantica_url")]
        if not args.force:
            candidates = [f for f in candidates if missing_fields(f)]
        print(f"{len(candidates)} fragrances to enrich\n")
        for i, frag in enumerate(candidates, 1):
            print(f"[{i}/{len(candidates)}]")
            enrich_one(frag, force=args.force)
            print()

    print("Done.")


if __name__ == "__main__":
    main()
