"""
api/routers/fragrances.py
Full CRUD + search + multi-source enrichment
"""
import json
import re
import time
import random
import secrets
import httpx
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from rapidfuzz import fuzz
from api.database import get_db, rows_to_list, row_to_dict

router = APIRouter()

FRAGELLA_KEY  = "80a84a7186a18cf309b88e6927a1adc667d9e01bc25a13ee44612c59087da198"
FRAGELLA_BASE = "https://api.fragella.com/api/v1"

SCRAPE_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

# ── MODELS ────────────────────────────────────────────────────
class FragranceUpdate(BaseModel):
    brand:               Optional[str]  = None
    name:                Optional[str]  = None
    size_ml:             Optional[float]= None
    concentration:       Optional[str]  = None
    gender_class:        Optional[str]  = None
    year_released:       Optional[int]  = None
    perfumer:            Optional[str]  = None
    top_notes:           Optional[list] = None
    middle_notes:        Optional[list] = None
    base_notes:          Optional[list] = None
    main_accords:        Optional[list] = None
    season_tags:         Optional[list] = None
    occasion_tags:       Optional[list] = None
    fragrantica_rating:  Optional[float]= None
    longevity_rating:    Optional[float]= None
    sillage_rating:      Optional[float]= None
    personal_rating:     Optional[float]= None
    fragrantica_url:     Optional[str]  = None
    basenotes_url:       Optional[str]  = None
    custom_image_url:    Optional[str]  = None
    fragella_image_url:  Optional[str]  = None
    purchase_price:      Optional[float]= None
    purchase_date:       Optional[str]  = None
    bottle_percentage:   Optional[float]= None
    decant_available:    Optional[bool] = None
    decant_size_ml:      Optional[float]= None
    is_discontinued:     Optional[bool] = None
    is_tester:           Optional[bool] = None
    is_limited_edition:  Optional[bool] = None
    is_exclusive:        Optional[bool] = None
    reformulation_notes: Optional[str]  = None
    is_reformulated:     Optional[bool] = None
    personal_notes:      Optional[str]  = None
    enrichment_locked:   Optional[bool] = None

class FragranceCreate(BaseModel):
    brand:         str
    name:          str
    size_ml:       Optional[float] = None
    concentration: Optional[str]   = None
    personal_notes:Optional[str]   = None


# ── LIST / SEARCH ─────────────────────────────────────────────
@router.get("")
def list_fragrances(
    search:       Optional[str]  = Query(None),
    brand:        Optional[str]  = Query(None),
    accord:       Optional[str]  = Query(None),
    note:         Optional[str]  = Query(None),
    gender:       Optional[str]  = Query(None),
    concentration:Optional[str]  = Query(None),
    season:       Optional[str]  = Query(None),
    discontinued: Optional[bool] = Query(None),
    tester:       Optional[bool] = Query(None),
    limited:      Optional[bool] = Query(None),
    sort:         str            = Query("brand_name"),
    limit:        int            = Query(500),
    offset:       int            = Query(0),
    db = Depends(get_db)
):
    q = "SELECT * FROM fragrances WHERE 1=1"
    params = []

    if search:
        q += " AND (brand LIKE ? OR name LIKE ? OR personal_notes LIKE ?)"
        s = f"%{search}%"
        params += [s, s, s]
    if brand:
        q += " AND brand LIKE ?"
        params.append(f"%{brand}%")
    if gender:
        q += " AND gender_class = ?"
        params.append(gender)
    if concentration:
        q += " AND concentration = ?"
        params.append(concentration)
    if discontinued is not None:
        q += " AND is_discontinued = ?"
        params.append(1 if discontinued else 0)
    if tester is not None:
        q += " AND is_tester = ?"
        params.append(1 if tester else 0)
    if limited is not None:
        q += " AND is_limited_edition = ?"
        params.append(1 if limited else 0)

    if note:
        q += """ AND id IN (
            SELECT fragrance_id FROM fragrance_notes
            WHERE note_name LIKE ? AND note_position IN ('top','middle','base')
        )"""
        params.append(f"%{note}%")
    if accord:
        q += """ AND id IN (
            SELECT fragrance_id FROM fragrance_notes
            WHERE note_name LIKE ? AND note_position = 'accord'
        )"""
        params.append(f"%{accord}%")

    if season:
        q += " AND season_tags LIKE ?"
        params.append(f"%{season}%")

    sort_map = {
        "brand_name":   "brand ASC, name ASC",
        "name":         "name ASC",
        "year":         "year_released DESC",
        "rating":       "personal_rating DESC NULLS LAST",
        "recent":       "id DESC",
        "last_worn":    "last_worn_date DESC NULLS LAST",
    }
    q += f" ORDER BY {sort_map.get(sort, 'brand ASC, name ASC')}"
    q += " LIMIT ? OFFSET ?"
    params += [limit, offset]

    rows = db.execute(q, params).fetchall()
    total = db.execute("SELECT COUNT(*) FROM fragrances WHERE 1=1", []).fetchone()[0]
    return {"total": total, "items": rows_to_list(rows)}


# ── GET ONE ───────────────────────────────────────────────────
@router.get("/{frag_id}")
def get_fragrance(frag_id: int, db = Depends(get_db)):
    row = db.execute("SELECT * FROM fragrances WHERE id = ?", (frag_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Fragrance not found")
    result = row_to_dict(row)
    result["wear_log"] = [
        {k: r[k] for k in r.keys()} for r in db.execute(
            "SELECT * FROM wear_log WHERE fragrance_id = ? ORDER BY worn_date DESC",
            (frag_id,)
        ).fetchall()
    ]
    return result


# ── CREATE ────────────────────────────────────────────────────
@router.post("")
def create_fragrance(data: FragranceCreate, db = Depends(get_db)):
    cur = db.execute("""
        INSERT INTO fragrances (brand, name, size_ml, concentration, personal_notes,
                                enrichment_status, top_notes, middle_notes, base_notes,
                                main_accords, season_tags, occasion_tags)
        VALUES (?, ?, ?, ?, ?, 'pending', '[]', '[]', '[]', '[]', '[]', '[]')
    """, (data.brand, data.name, data.size_ml, data.concentration, data.personal_notes))
    db.commit()
    row = db.execute("SELECT * FROM fragrances WHERE id = ?", (cur.lastrowid,)).fetchone()
    return row_to_dict(row)


# ── UPDATE ────────────────────────────────────────────────────
@router.patch("/{frag_id}")
def update_fragrance(frag_id: int, data: FragranceUpdate, db = Depends(get_db)):
    row = db.execute("SELECT * FROM fragrances WHERE id = ?", (frag_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Fragrance not found")

    updates = {}
    for field, value in data.dict(exclude_none=True).items():
        if isinstance(value, list):
            updates[field] = json.dumps(value)
        elif isinstance(value, bool):
            updates[field] = 1 if value else 0
        else:
            updates[field] = value

    if not updates:
        return row_to_dict(row)

    updates["manually_edited"] = 1
    set_clause = ", ".join(f"{k} = ?" for k in updates)
    db.execute(
        f"UPDATE fragrances SET {set_clause} WHERE id = ?",
        list(updates.values()) + [frag_id]
    )

    note_fields = {"top_notes", "middle_notes", "base_notes", "main_accords"}
    if note_fields & set(data.dict(exclude_none=True).keys()):
        _rebuild_notes(db, frag_id, data)

    db.commit()
    return row_to_dict(db.execute("SELECT * FROM fragrances WHERE id = ?", (frag_id,)).fetchone())


def _rebuild_notes(db, frag_id, data):
    db.execute("DELETE FROM fragrance_notes WHERE fragrance_id = ?", (frag_id,))
    rows = []
    for pos, lst in [
        ("top",    data.top_notes    or []),
        ("middle", data.middle_notes or []),
        ("base",   data.base_notes   or []),
        ("accord", data.main_accords or []),
    ]:
        for note in lst:
            if note:
                rows.append((frag_id, note, pos))
    if rows:
        db.executemany(
            "INSERT INTO fragrance_notes (fragrance_id, note_name, note_position) VALUES (?,?,?)",
            rows
        )


# ── DELETE ────────────────────────────────────────────────────
@router.delete("/{frag_id}")
def delete_fragrance(frag_id: int, db = Depends(get_db)):
    row = db.execute("SELECT id FROM fragrances WHERE id = ?", (frag_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Fragrance not found")
    db.execute("DELETE FROM fragrances WHERE id = ?", (frag_id,))
    db.commit()
    return {"deleted": True}


# ══════════════════════════════════════════════════════════════
# SCRAPER HELPERS
# ══════════════════════════════════════════════════════════════

def _delay():
    time.sleep(random.uniform(1.2, 2.8))


def _fetch(client, url, timeout=20):
    try:
        _delay()
        r = client.get(url, headers=SCRAPE_HEADERS, timeout=timeout, follow_redirects=True)
        return r if r.status_code == 200 else None
    except Exception:
        return None


# ── FRAGELLA ──────────────────────────────────────────────────
def _fetch_fragella(brand: str, name: str) -> dict | None:
    try:
        with httpx.Client() as client:
            resp = client.get(
                f"{FRAGELLA_BASE}/fragrances",
                headers={"x-api-key": FRAGELLA_KEY},
                params={"search": f"{brand} {name}", "limit": 5},
                timeout=15
            )
        if resp.status_code != 200 or not resp.json():
            return None
        results = resp.json()
        target = f"{brand} {name}".lower()
        best, best_score = None, 0
        for item in results:
            candidate = f"{item.get('Brand','')} {item.get('Name','')}".lower()
            score = fuzz.token_set_ratio(target, candidate)
            if score > best_score:
                best_score = score
                best = item
        return best if best_score >= 60 else None
    except Exception:
        return None


def _normalize_fragella(data: dict) -> dict:
    """Convert Fragella response to our internal field names."""
    notes = data.get("Notes") or {}
    def extract_notes(lst):
        if not lst:
            return []
        return [n["name"] if isinstance(n, dict) else str(n) for n in lst]

    result = {}
    if data.get("Year"):
        try: result["year_released"] = int(data["Year"])
        except (ValueError, TypeError): pass
    if data.get("Gender"):
        result["gender_class"] = data["Gender"]
    if data.get("Concentration"):
        result["concentration"] = data["Concentration"]
    if data.get("Perfumer"):
        result["perfumer"] = data["Perfumer"]
    top = extract_notes(notes.get("Top"))
    mid = extract_notes(notes.get("Middle"))
    base= extract_notes(notes.get("Base"))
    if top:  result["top_notes"]    = top
    if mid:  result["middle_notes"] = mid
    if base: result["base_notes"]   = base
    accords = data.get("Accords") or []
    if accords:
        result["main_accords"] = [a["name"] if isinstance(a, dict) else str(a) for a in accords]
    if data.get("Rating"):
        try: result["fragrantica_rating"] = float(data["Rating"])
        except (ValueError, TypeError): pass
    img = data.get("Image URL") or data.get("ImageUrl") or data.get("image_url")
    if img:
        result["fragella_image_url"] = img
    return result


# ── FRAGRANTICA SEARCH ────────────────────────────────────────
def _find_fragrantica_url(brand: str, name: str) -> str | None:
    """
    Search Fragrantica directly and return the best matching perfume URL.
    Tries multiple search strategies for robustness.
    """
    try:
        from bs4 import BeautifulSoup
        target = f"{brand} {name}".lower()

        def search_ft(query: str):
            encoded = query.replace(" ", "+")
            url = f"https://www.fragrantica.com/search/?query={encoded}"
            with httpx.Client() as client:
                resp = _fetch(client, url)
            if not resp:
                return None
            soup = BeautifulSoup(resp.text, "lxml")
            best_url, best_score = None, 0
            for a in soup.select("a[href*='/perfume/']"):
                href = a.get("href", "")
                if not href.startswith("http"):
                    href = "https://www.fragrantica.com" + href
                # Must have numeric ID pattern
                if not re.search(r"-\d+\.html$", href):
                    continue
                text = a.get_text(strip=True).lower()
                path = href.split("/perfume/")[-1].replace("-", " ").replace(".html", "").lower()
                score = max(
                    fuzz.token_set_ratio(target, text),
                    fuzz.token_set_ratio(target, path),
                )
                if score > best_score:
                    best_score = score
                    best_url = href
            return best_url if best_score >= 45 else None

        # Strategy 1: full "brand name"
        result = search_ft(f"{brand} {name}")
        if result:
            return result

        # Strategy 2: name only (helps when brand name has accents/variations)
        result = search_ft(name)
        if result:
            return result

        # Strategy 3: first word of brand + name
        short_brand = brand.split()[0] if brand else ""
        if short_brand and short_brand.lower() != brand.lower():
            result = search_ft(f"{short_brand} {name}")
            if result:
                return result

        return None
    except Exception:
        return None


def _scrape_fragrantica(url: str) -> dict:
    """Scrape a Fragrantica perfume page and return normalized data + image URL."""
    from bs4 import BeautifulSoup
    result = {}
    try:
        with httpx.Client() as client:
            resp = _fetch(client, url)
        if not resp:
            return result
        soup = BeautifulSoup(resp.text, "lxml")

        # Image — Fragrantica main product image
        img_el = (
            soup.select_one('img[itemprop="image"]') or
            soup.select_one('.perfume-image img') or
            soup.select_one('#main-image') or
            soup.select_one('img[src*="/images/perfume/"]')
        )
        if img_el:
            img_src = img_el.get("src", "")
            if img_src and not img_src.endswith("nopic.jpg"):
                if not img_src.startswith("http"):
                    img_src = "https://www.fragrantica.com" + img_src
                result["fragrantica_image_url"] = img_src

        # Notes pyramid
        notes = {"top": [], "middle": [], "base": []}
        for cell in soup.select(".cell.pyramid-cell, [class*='pyramid']"):
            label = cell.select_one("label, .notes-box label")
            if not label:
                continue
            label_text = label.text.strip().lower()
            items = []
            for el in cell.select("img[alt], span.cell-name"):
                n = el.get("alt", el.text.strip())
                if n: items.append(n)
            if "top" in label_text:       notes["top"]    = items
            elif "heart" in label_text or "middle" in label_text: notes["middle"] = items
            elif "base" in label_text:    notes["base"]   = items
        if notes["top"]:    result["top_notes"]    = notes["top"]
        if notes["middle"]: result["middle_notes"] = notes["middle"]
        if notes["base"]:   result["base_notes"]   = notes["base"]

        # Accords
        accords = [a.text.strip() for a in soup.select(".cell.accord-box span, [class*='accord'] span")]
        if accords: result["main_accords"] = accords

        # Year
        for el in soup.select("b, strong"):
            m = re.search(r'\b(19[5-9]\d|20[0-2]\d)\b', el.parent.get_text() if el.parent else "")
            if m:
                result["year_released"] = int(m.group())
                break

        # Rating
        rating_el = soup.select_one('[itemprop="ratingValue"]')
        if rating_el:
            try: result["fragrantica_rating"] = float(rating_el.text.strip())
            except (ValueError, TypeError): pass

        # Perfumer
        for a in soup.select('a[href*="/noses/"]'):
            result["perfumer"] = a.text.strip()
            break

        # Gender
        for el in soup.select("small, .gender"):
            txt = el.text.strip().lower()
            if "for women" in txt and "men" in txt:
                result["gender_class"] = "Unisex"
                break
            elif "for women" in txt:
                result["gender_class"] = "Female"
                break
            elif "for men" in txt:
                result["gender_class"] = "Male"
                break

        # Longevity + Sillage from vote bars
        for row in soup.select(".voting-small-chart-size"):
            label = row.get_text(strip=True).lower()
            bar = row.find_next("span", class_=re.compile("vote"))
            if bar:
                try:
                    val = float(re.search(r'[\d.]+', bar.text).group()) / 2  # normalize to /5
                    if "longevity" in label:   result["longevity_rating"] = round(val, 1)
                    elif "sillage" in label:   result["sillage_rating"]   = round(val, 1)
                except (AttributeError, ValueError, TypeError):
                    pass

    except Exception:
        pass
    return result


# ── BASENOTES SCRAPER ─────────────────────────────────────────
def _scrape_basenotes(brand: str, name: str) -> dict:
    from bs4 import BeautifulSoup
    result = {}
    try:
        query = f"{brand} {name}".replace(" ", "+")
        search_url = f"https://basenotes.com/search/?q={query}"
        with httpx.Client() as client:
            resp = _fetch(client, search_url)
            if not resp:
                return result
            soup = BeautifulSoup(resp.text, "lxml")
            target = f"{brand} {name}".lower()
            best_url, best_score = None, 0
            for a in soup.select("a[href*='/fragrances/']"):
                text = a.get_text(strip=True).lower()
                score = fuzz.token_set_ratio(target, text)
                if score > best_score:
                    best_score = score
                    href = a.get("href", "")
                    best_url = href if href.startswith("http") else "https://basenotes.com" + href
            if best_score < 55 or not best_url:
                return result
            resp2 = _fetch(client, best_url)
            if not resp2:
                return result
            soup2 = BeautifulSoup(resp2.text, "lxml")

        # Notes
        for section in soup2.select(".notescontainer, .notes-grid"):
            label = section.get_text(strip=True).lower()
            notes_list = [n.text.strip() for n in section.select("a, span.note")]
            if "top" in label:    result["top_notes"]    = notes_list
            elif "middle" in label or "heart" in label: result["middle_notes"] = notes_list
            elif "base" in label: result["base_notes"]   = notes_list

        # Year
        for el in soup2.select("td, .meta-value"):
            m = re.search(r'\b(19[5-9]\d|20[0-2]\d)\b', el.text)
            if m:
                result["year_released"] = int(m.group())
                break

        # Perfumer
        for a in soup2.select('a[href*="/perfumer/"], a[href*="/nose/"]'):
            result["perfumer"] = a.text.strip()
            break

    except Exception:
        pass
    return result


# ── PARFUMO SCRAPER ───────────────────────────────────────────
def _scrape_parfumo(brand: str, name: str) -> dict:
    from bs4 import BeautifulSoup
    result = {}
    try:
        query = f"{brand} {name}".replace(" ", "+")
        search_url = f"https://www.parfumo.com/search?q={query}"
        with httpx.Client() as client:
            resp = _fetch(client, search_url)
            if not resp:
                return result
            soup = BeautifulSoup(resp.text, "lxml")
            target = f"{brand} {name}".lower()
            best_url, best_score = None, 0
            for a in soup.select("a[href*='/Perfumes/']"):
                text = a.get_text(strip=True).lower()
                score = fuzz.token_set_ratio(target, text)
                if score > best_score:
                    best_score = score
                    href = a.get("href", "")
                    best_url = href if href.startswith("http") else "https://www.parfumo.com" + href
            if best_score < 55 or not best_url:
                return result
            resp2 = _fetch(client, best_url)
            if not resp2:
                return result
            soup2 = BeautifulSoup(resp2.text, "lxml")

        # Notes
        for div in soup2.select(".notes_list, .olfactory_pyramid"):
            for item in div.select(".note_name, a"):
                txt = item.text.strip()
                if txt:
                    result.setdefault("main_accords", []).append(txt)

        # Year
        for el in soup2.select(".meta, .details td"):
            m = re.search(r'\b(19[5-9]\d|20[0-2]\d)\b', el.text)
            if m:
                result["year_released"] = int(m.group())
                break

        # Perfumer
        for a in soup2.select('a[href*="/Perfumers/"]'):
            result["perfumer"] = a.text.strip()
            break

        # Gender
        for el in soup2.select(".gender, .meta"):
            txt = el.text.strip().lower()
            if "unisex" in txt:     result["gender_class"] = "Unisex"
            elif "women" in txt:    result["gender_class"] = "Female"
            elif "men" in txt:      result["gender_class"] = "Male"

    except Exception:
        pass
    return result


# ── CONFIDENCE MERGE ──────────────────────────────────────────
def _majority_value(values: list):
    """Return the most common value if it appears in majority of sources, else None."""
    if not values:
        return None
    counts = {}
    for v in values:
        if v is not None:
            k = str(v).lower().strip()
            counts[k] = counts.get(k, 0) + 1
    if not counts:
        return None
    top_key = max(counts, key=counts.__getitem__)
    top_count = counts[top_key]
    # Accept majority (>= half of non-None sources)
    if top_count >= max(2, len(values) // 2):
        # Return original typed value
        for v in values:
            if v is not None and str(v).lower().strip() == top_key:
                return v
    return None


def _merge_sources(sources: list[dict]) -> tuple[dict, list[dict]]:
    """
    Merge multiple source dicts using majority/confidence logic.
    Returns (auto_merged, conflicts) where conflicts is a list of
    {field, values: [{source, value}]} for fields that couldn't be auto-resolved.
    """
    SCALAR_FIELDS = [
        "year_released", "gender_class", "concentration",
        "perfumer", "fragrantica_rating", "longevity_rating", "sillage_rating",
    ]
    LIST_FIELDS = ["top_notes", "middle_notes", "base_notes", "main_accords"]
    SOURCE_NAMES = ["fragella", "fragrantica", "basenotes", "parfumo"]

    merged = {}
    conflicts = []

    for field in SCALAR_FIELDS:
        vals = []
        source_vals = []
        for i, src in enumerate(sources):
            v = src.get(field)
            if v is not None:
                vals.append(v)
                source_vals.append({"source": SOURCE_NAMES[i] if i < len(SOURCE_NAMES) else f"source{i}", "value": v})

        if not vals:
            continue

        # Special case: year outlier correction (e.g. 1809 vs 2009)
        if field == "year_released":
            valid = [v for v in vals if isinstance(v, int) and 1900 <= v <= 2030]
            if valid:
                majority = _majority_value(valid)
                if majority:
                    merged[field] = majority
                elif len(set(valid)) > 1:
                    conflicts.append({"field": field, "values": source_vals})
            continue

        majority = _majority_value(vals)
        if majority is not None:
            merged[field] = majority
        elif len(set(str(v) for v in vals)) > 1:
            conflicts.append({"field": field, "values": source_vals})
        elif vals:
            merged[field] = vals[0]

    for field in LIST_FIELDS:
        all_lists = []
        source_vals = []
        for i, src in enumerate(sources):
            v = src.get(field)
            if v and isinstance(v, list) and len(v) > 0:
                all_lists.append(v)
                source_vals.append({
                    "source": SOURCE_NAMES[i] if i < len(SOURCE_NAMES) else f"source{i}",
                    "value": v
                })

        if not all_lists:
            continue

        if len(all_lists) == 1:
            merged[field] = all_lists[0]
            continue

        # Compare lists by overlap — if majority agree within 2 items, auto-accept
        base = set(n.lower() for n in all_lists[0])
        agreements = sum(
            1 for lst in all_lists[1:]
            if len(base.symmetric_difference(set(n.lower() for n in lst))) <= 3
        )
        if agreements >= len(all_lists) - 1:
            # Take the longest list from agreeing sources
            merged[field] = max(all_lists, key=len)
        else:
            conflicts.append({"field": field, "values": source_vals})

    return merged, conflicts


# ── IMAGE FETCH ───────────────────────────────────────────────
def _fragrantica_id_from_url(url: str) -> str | None:
    """Extract numeric ID from Fragrantica URL e.g. .../Name-38166.html -> 38166"""
    if not url:
        return None
    m = re.search(r'-(\d+)\.html', url)
    return m.group(1) if m else None


def _fimgs_url(fragrantica_id: str) -> str:
    """Construct fimgs.net CDN image URL from Fragrantica perfume ID."""
    return f"https://fimgs.net/mdimg/perfume-thumbs/375x500.{fragrantica_id}.jpg"


def _fetch_best_image(brand: str, name: str, fragrantica_url: str = None) -> dict:
    """
    Build image URL from Fragrantica CDN (fimgs.net) using perfume ID extracted
    from the Fragrantica URL. Falls back to searching Fragrantica, then Fragella.
    Returns {"url": str, "source": str, "fragrantica_url": str|None}
    """
    result = {"url": None, "source": "manual_needed", "fragrantica_url": None}

    # 1. Extract ID from stored Fragrantica URL -> direct CDN link, no scraping needed
    ft_id = _fragrantica_id_from_url(fragrantica_url)
    if ft_id:
        result["url"] = _fimgs_url(ft_id)
        result["source"] = "fragrantica"
        return result

    # 2. Search Fragrantica to find the URL, then extract ID
    found_url = _find_fragrantica_url(brand, name)
    if found_url:
        ft_id = _fragrantica_id_from_url(found_url)
        if ft_id:
            result["url"] = _fimgs_url(ft_id)
            result["source"] = "fragrantica"
            result["fragrantica_url"] = found_url
            return result

    # 3. Fragella fallback
    fe_data = _fetch_fragella(brand, name)
    if fe_data:
        norm = _normalize_fragella(fe_data)
        img = norm.get("fragella_image_url")
        if img:
            result["url"] = img
            result["source"] = "fragella"
            return result

    return result


# ══════════════════════════════════════════════════════════════
# ENRICHMENT ENDPOINTS
# ══════════════════════════════════════════════════════════════

@router.post("/{frag_id}/enrich/smart")
def enrich_smart(frag_id: int, db = Depends(get_db)):
    """
    Fill only missing fields. Respect enrichment_locked.
    Returns auto-merged data + any conflicts for frontend to resolve.
    """
    row = db.execute("SELECT * FROM fragrances WHERE id = ?", (frag_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Not found")
    if row["enrichment_locked"]:
        raise HTTPException(400, "Enrichment is locked for this fragrance")

    frag = row_to_dict(row)
    brand, name = frag["brand"], frag["name"]

    # Determine what's actually missing
    missing = _get_missing_fields(frag)
    if not missing:
        return {"status": "complete", "message": "Nothing missing — all fields already filled", "conflicts": [], "merged": {}}

    # Fetch all sources
    sources = _fetch_all_sources(brand, name, frag.get("fragrantica_url"), frag.get("basenotes_url"))

    # Merge
    merged, conflicts = _merge_sources([
        sources["fragella"],
        sources["fragrantica"],
        sources["basenotes"],
        sources["parfumo"],
    ])

    # Only keep fields that were actually missing
    merged = {k: v for k, v in merged.items() if k in missing}
    conflicts = [c for c in conflicts if c["field"] in missing]

    # Image — only if missing
    image_result = None
    if not frag.get("custom_image_url") and not frag.get("fragella_image_url"):
        image_result = _fetch_best_image(brand, name, sources.get("fragrantica_url"))
        if image_result["url"]:
            merged["fragella_image_url"] = image_result["url"]

    # Save fragrantica_url if we found one
    if sources.get("fragrantica_url") and not frag.get("fragrantica_url"):
        merged["fragrantica_url"] = sources["fragrantica_url"]

    return {
        "status": "ok",
        "missing_fields": missing,
        "merged": merged,
        "conflicts": conflicts,
        "image": image_result,
        "sources_found": {k: bool(v) for k, v in sources.items() if k != "fragrantica_url"},
    }


@router.post("/{frag_id}/enrich/rescrape")
def enrich_rescrape(frag_id: int, db = Depends(get_db)):
    """
    Re-fetch all fields regardless of existing data. Respect enrichment_locked.
    Returns merged data + conflicts for frontend to review before applying.
    """
    row = db.execute("SELECT * FROM fragrances WHERE id = ?", (frag_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Not found")
    if row["enrichment_locked"]:
        raise HTTPException(400, "Enrichment is locked for this fragrance")

    frag = row_to_dict(row)
    brand, name = frag["brand"], frag["name"]

    sources = _fetch_all_sources(brand, name, frag.get("fragrantica_url"), frag.get("basenotes_url"))
    merged, conflicts = _merge_sources([
        sources["fragella"],
        sources["fragrantica"],
        sources["basenotes"],
        sources["parfumo"],
    ])

    # Always refresh image on rescrape
    image_result = _fetch_best_image(brand, name, sources.get("fragrantica_url"))
    if image_result["url"]:
        merged["fragella_image_url"] = image_result["url"]

    if sources.get("fragrantica_url"):
        merged["fragrantica_url"] = sources["fragrantica_url"]

    return {
        "status": "ok",
        "merged": merged,
        "conflicts": conflicts,
        "image": image_result,
        "sources_found": {k: bool(v) for k, v in sources.items() if k != "fragrantica_url"},
    }


@router.post("/{frag_id}/enrich/image")
def enrich_image_only(frag_id: int, db = Depends(get_db)):
    """Force refresh the image only."""
    row = db.execute("SELECT * FROM fragrances WHERE id = ?", (frag_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Not found")
    if row["enrichment_locked"]:
        raise HTTPException(400, "Enrichment is locked for this fragrance")

    frag = row_to_dict(row)
    result = _fetch_best_image(frag["brand"], frag["name"], frag.get("fragrantica_url"))

    if result["url"]:
        db.execute(
            "UPDATE fragrances SET fragella_image_url = ? WHERE id = ?",
            (result["url"], frag_id)
        )
        db.commit()
        return {"status": "ok", "url": result["url"], "source": result["source"]}

    return {"status": "manual_needed", "url": None, "source": "manual_needed"}


@router.post("/{frag_id}/enrich/image/preview")
def enrich_image_preview(frag_id: int, db = Depends(get_db)):
    """
    Return image candidate for user confirmation without saving anything.
    If fragrantica_url is already stored, extract ID and build fimgs URL instantly.
    Otherwise fall back to Fragella image.
    """
    row = db.execute("SELECT * FROM fragrances WHERE id = ?", (frag_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Not found")
    if row["enrichment_locked"]:
        raise HTTPException(400, "Enrichment is locked for this fragrance")

    frag = row_to_dict(row)
    ft_url = frag.get("fragrantica_url")

    # Fast path — Fragrantica URL already stored, extract ID and build CDN URL directly
    if ft_url:
        ft_id = _fragrantica_id_from_url(ft_url)
        if ft_id:
            return {
                "url":             _fimgs_url(ft_id),
                "source":          "fragrantica",
                "fragrantica_url": ft_url,
            }

    # Slow path — no Fragrantica URL stored, fall back to Fragella only
    # (Fragrantica search disabled — too unreliable on Railway)
    fe_data = _fetch_fragella(frag["brand"], frag["name"])
    if fe_data:
        norm = _normalize_fragella(fe_data)
        img  = norm.get("fragella_image_url")
        if img:
            return {
                "url":             img,
                "source":          "fragella",
                "fragrantica_url": None,
            }

    return {
        "url":             None,
        "source":          "manual_needed",
        "fragrantica_url": None,
    }


@router.post("/{frag_id}/enrich/apply")
def apply_enrichment(frag_id: int, payload: dict, db = Depends(get_db)):
    """
    Apply pre-reviewed enrichment data.
    payload: { "data": {...}, "lock": bool }
    """
    row = db.execute("SELECT * FROM fragrances WHERE id = ?", (frag_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Not found")

    data = payload.get("data", {})
    lock = payload.get("lock", False)

    updates = {k: v for k, v in data.items() if v is not None}
    for field in ["top_notes", "middle_notes", "base_notes", "main_accords", "season_tags", "occasion_tags"]:
        if field in updates and isinstance(updates[field], list):
            updates[field] = json.dumps(updates[field])

    updates["enrichment_status"] = "success"
    updates["enrichment_locked"] = 1 if lock else 0
    updates["manually_edited"]   = 1

    set_clause = ", ".join(f"{k} = ?" for k in updates)
    db.execute(
        f"UPDATE fragrances SET {set_clause} WHERE id = ?",
        list(updates.values()) + [frag_id]
    )
    db.commit()
    return row_to_dict(db.execute("SELECT * FROM fragrances WHERE id = ?", (frag_id,)).fetchone())


# ── HELPERS ───────────────────────────────────────────────────
def _get_missing_fields(frag: dict) -> list[str]:
    missing = []
    if not frag.get("year_released"):        missing.append("year_released")
    if not frag.get("gender_class"):         missing.append("gender_class")
    if not frag.get("concentration"):        missing.append("concentration")
    if not frag.get("perfumer"):             missing.append("perfumer")
    if not frag.get("top_notes"):            missing.append("top_notes")
    if not frag.get("middle_notes"):         missing.append("middle_notes")
    if not frag.get("base_notes"):           missing.append("base_notes")
    if not frag.get("main_accords"):         missing.append("main_accords")
    if not frag.get("fragrantica_rating"):   missing.append("fragrantica_rating")
    if not frag.get("longevity_rating"):     missing.append("longevity_rating")
    if not frag.get("sillage_rating"):       missing.append("sillage_rating")
    if not frag.get("custom_image_url") and not frag.get("fragella_image_url"):
        missing.append("image")
    return missing


def _fetch_all_sources(brand: str, name: str, fragrantica_url: str = None, basenotes_url: str = None) -> dict:
    sources = {
        "fragella":    {},
        "fragrantica": {},
        "basenotes":   {},
        "parfumo":     {},
        "fragrantica_url": fragrantica_url,
    }

    # Fragella
    fe = _fetch_fragella(brand, name)
    if fe:
        sources["fragella"] = _normalize_fragella(fe)

    # Fragrantica — find URL if not stored
    ft_url = fragrantica_url
    if not ft_url:
        ft_url = _find_fragrantica_url(brand, name)
        if ft_url:
            sources["fragrantica_url"] = ft_url
    if ft_url:
        sources["fragrantica"] = _scrape_fragrantica(ft_url)

    # Basenotes
    sources["basenotes"] = _scrape_basenotes(brand, name)

    # Parfumo
    sources["parfumo"] = _scrape_parfumo(brand, name)

    return sources


# ── SIMILAR ───────────────────────────────────────────────────
@router.get("/{frag_id}/similar")
def get_similar(frag_id: int, db = Depends(get_db)):
    row = db.execute("SELECT * FROM fragrances WHERE id = ?", (frag_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Not found")
    try:
        with httpx.Client() as client:
            resp = client.get(
                f"{FRAGELLA_BASE}/fragrances/similar",
                headers={"x-api-key": FRAGELLA_KEY},
                params={"name": f"{row['brand']} {row['name']}", "limit": 5},
                timeout=15
            )
        if resp.status_code == 200:
            return resp.json()
    except Exception:
        pass
    return {"similar_fragrances": []}


# ── STATS SUMMARY ─────────────────────────────────────────────
@router.get("/meta/stats")
def get_stats(db = Depends(get_db)):
    total    = db.execute("SELECT COUNT(*) FROM fragrances").fetchone()[0]
    enriched = db.execute("SELECT COUNT(*) FROM fragrances WHERE enrichment_status='success'").fetchone()[0]
    brands   = db.execute("SELECT COUNT(DISTINCT brand) FROM fragrances").fetchone()[0]
    testers  = db.execute("SELECT COUNT(*) FROM fragrances WHERE is_tester=1").fetchone()[0]
    disc     = db.execute("SELECT COUNT(*) FROM fragrances WHERE is_discontinued=1").fetchone()[0]
    limited  = db.execute("SELECT COUNT(*) FROM fragrances WHERE is_limited_edition=1").fetchone()[0]

    accords  = db.execute("""
        SELECT note_name, COUNT(*) as cnt FROM fragrance_notes
        WHERE note_position='accord' GROUP BY note_name ORDER BY cnt DESC LIMIT 10
    """).fetchall()
    by_conc  = db.execute("""
        SELECT concentration, COUNT(*) as cnt FROM fragrances
        WHERE concentration IS NOT NULL GROUP BY concentration ORDER BY cnt DESC
    """).fetchall()
    by_decade= db.execute("""
        SELECT (year_released/10)*10 as decade, COUNT(*) as cnt FROM fragrances
        WHERE year_released IS NOT NULL GROUP BY decade ORDER BY decade
    """).fetchall()
    by_gender= db.execute("""
        SELECT gender_class, COUNT(*) as cnt FROM fragrances
        WHERE gender_class IS NOT NULL GROUP BY gender_class
    """).fetchall()

    return {
        "total": total, "enriched": enriched, "brands": brands,
        "testers": testers, "discontinued": disc, "limited": limited,
        "top_accords":      [{k: r[k] for k in r.keys()} for r in accords],
        "by_concentration": [{k: r[k] for k in r.keys()} for r in by_conc],
        "by_decade":        [{k: r[k] for k in r.keys()} for r in by_decade],
        "by_gender":        [{k: r[k] for k in r.keys()} for r in by_gender],
    }
