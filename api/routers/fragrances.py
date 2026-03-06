"""
api/routers/fragrances.py
Full CRUD + search + manual enrichment + conflict resolution
"""
import json
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
@router.get("/")
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

    # Note/accord search via fragrance_notes table
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

    # Season filter
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
    total = db.execute(
        "SELECT COUNT(*) FROM fragrances WHERE 1=1", []
    ).fetchone()[0]

    return {"total": total, "items": rows_to_list(rows)}


# ── GET ONE ───────────────────────────────────────────────────
@router.get("/{frag_id}")
def get_fragrance(frag_id: int, db = Depends(get_db)):
    row = db.execute("SELECT * FROM fragrances WHERE id = ?", (frag_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Fragrance not found")
    result = row_to_dict(row)
    # Attach wear log
    result["wear_log"] = [
        dict(r) for r in db.execute(
            "SELECT * FROM wear_log WHERE fragrance_id = ? ORDER BY worn_date DESC",
            (frag_id,)
        ).fetchall()
    ]
    return result


# ── CREATE ────────────────────────────────────────────────────
@router.post("/")
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

    # Rebuild notes lookup if notes changed
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


# ── ENRICH: FRAGELLA ONLY ─────────────────────────────────────
@router.post("/{frag_id}/enrich")
def enrich_fragrance(frag_id: int, db = Depends(get_db)):
    row = db.execute("SELECT * FROM fragrances WHERE id = ?", (frag_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Not found")
    if row["enrichment_locked"]:
        raise HTTPException(400, "Enrichment is locked for this fragrance")

    brand = row["brand"]
    name  = row["name"]

    with httpx.Client() as client:
        resp = client.get(
            f"{FRAGELLA_BASE}/fragrances",
            headers={"x-api-key": FRAGELLA_KEY},
            params={"search": f"{brand} {name}", "limit": 5},
            timeout=15
        )

    if resp.status_code != 200:
        raise HTTPException(502, f"Fragella returned {resp.status_code}")

    results = resp.json()
    if not results:
        raise HTTPException(404, "No Fragella results found")

    # Fuzzy match
    target = f"{brand} {name}".lower()
    best, best_score = None, 0
    for item in results:
        candidate = f"{item.get('Brand','')} {item.get('Name','')}".lower()
        score = fuzz.token_set_ratio(target, candidate)
        if score > best_score:
            best_score = score
            best = item

    if best_score < 60:
        raise HTTPException(404, f"No confident match found (best score: {best_score})")

    return {"source": "fragella", "score": best_score, "data": best}


# ── ENRICH: CONFLICT CHECK (Fragella + Fragrantica) ───────────
@router.post("/{frag_id}/enrich/compare")
def enrich_compare(frag_id: int, db = Depends(get_db)):
    """
    Fetch from both Fragella and Fragrantica, return both results.
    Frontend shows diff and lets user pick or merge.
    """
    row = db.execute("SELECT * FROM fragrances WHERE id = ?", (frag_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Not found")

    brand = row["brand"]
    name  = row["name"]
    result = {"fragella": None, "fragrantica": None, "conflicts": []}

    # Fragella
    try:
        with httpx.Client() as client:
            resp = client.get(
                f"{FRAGELLA_BASE}/fragrances",
                headers={"x-api-key": FRAGELLA_KEY},
                params={"search": f"{brand} {name}", "limit": 3},
                timeout=15
            )
        if resp.status_code == 200 and resp.json():
            results = resp.json()
            target = f"{brand} {name}".lower()
            best, best_score = None, 0
            for item in results:
                candidate = f"{item.get('Brand','')} {item.get('Name','')}".lower()
                score = fuzz.token_set_ratio(target, candidate)
                if score > best_score:
                    best_score = score
                    best = item
            if best_score >= 60:
                result["fragella"] = best
    except Exception:
        pass

    # Fragrantica (single-page scrape if URL exists)
    fragrantica_url = row["fragrantica_url"]
    if fragrantica_url:
        try:
            from bs4 import BeautifulSoup
            import time, random
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
            time.sleep(random.uniform(1.5, 3.0))
            with httpx.Client() as client:
                resp = client.get(fragrantica_url, headers=headers, timeout=20, follow_redirects=True)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "html.parser")
                ft_data = _parse_fragrantica(soup)
                result["fragrantica"] = ft_data
        except Exception as e:
            result["fragrantica_error"] = str(e)

    # Detect conflicts
    if result["fragella"] and result["fragrantica"]:
        result["conflicts"] = _detect_conflicts(result["fragella"], result["fragrantica"])

    return result


def _parse_fragrantica(soup):
    """Extract key fields from a Fragrantica page."""
    data = {}
    try:
        # Notes
        notes = {"top": [], "middle": [], "base": []}
        for cell in soup.select(".cell.pyramid-cell"):
            label = cell.select_one(".notes-box label")
            if not label:
                continue
            label_text = label.text.strip().lower()
            note_items = [n.get("alt", n.text.strip()) for n in cell.select("img[alt], span.cell-name")]
            if "top" in label_text:
                notes["top"] = note_items
            elif "heart" in label_text or "middle" in label_text:
                notes["middle"] = note_items
            elif "base" in label_text:
                notes["base"] = note_items
        data["notes"] = notes

        # Accords
        data["accords"] = [
            a.text.strip() for a in soup.select(".cell.accord-box span")
        ]

        # Year
        year_el = soup.select_one(".grid-x .cell b")
        if year_el:
            import re
            m = re.search(r'\b(19|20)\d{2}\b', year_el.parent.text)
            if m:
                data["year"] = int(m.group())

        # Rating
        rating_el = soup.select_one('[itemprop="ratingValue"]')
        if rating_el:
            try:
                data["rating"] = float(rating_el.text.strip())
            except ValueError:
                pass

    except Exception:
        pass
    return data


def _detect_conflicts(fragella: dict, fragrantica: dict) -> list:
    """Compare two sources and return list of conflicting fields."""
    conflicts = []
    ft_notes = fragrantica.get("notes", {})
    fe_notes = fragella.get("Notes", {})

    def note_names(lst):
        return set(n["name"] if isinstance(n, dict) else n for n in (lst or []))

    for pos, ft_key, fe_key in [
        ("top_notes",    "top",    "Top"),
        ("middle_notes", "middle", "Middle"),
        ("base_notes",   "base",   "Base"),
    ]:
        ft_set = note_names(ft_notes.get(ft_key, []))
        fe_set = note_names(fe_notes.get(fe_key, []))
        if ft_set and fe_set and len(ft_set.symmetric_difference(fe_set)) > 2:
            conflicts.append({
                "field":       pos,
                "fragella":    list(fe_set),
                "fragrantica": list(ft_set),
            })

    # Year
    ft_year = fragrantica.get("year")
    fe_year = fragella.get("Year")
    if ft_year and fe_year:
        try:
            if abs(int(ft_year) - int(fe_year)) > 1:
                conflicts.append({
                    "field": "year_released",
                    "fragella": fe_year,
                    "fragrantica": ft_year,
                })
        except (ValueError, TypeError):
            pass

    return conflicts


# ── APPLY ENRICHMENT CHOICE ───────────────────────────────────
@router.post("/{frag_id}/enrich/apply")
def apply_enrichment(
    frag_id: int,
    payload: dict,
    db = Depends(get_db)
):
    """
    payload: { "source": "fragella"|"fragrantica"|"merge", "data": {...}, "lock": bool }
    """
    row = db.execute("SELECT * FROM fragrances WHERE id = ?", (frag_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Not found")

    data    = payload.get("data", {})
    lock    = payload.get("lock", False)

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


# ── SIMILAR FRAGRANCES ────────────────────────────────────────
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
    total      = db.execute("SELECT COUNT(*) FROM fragrances").fetchone()[0]
    enriched   = db.execute("SELECT COUNT(*) FROM fragrances WHERE enrichment_status='success'").fetchone()[0]
    brands     = db.execute("SELECT COUNT(DISTINCT brand) FROM fragrances").fetchone()[0]
    testers    = db.execute("SELECT COUNT(*) FROM fragrances WHERE is_tester=1").fetchone()[0]
    disc       = db.execute("SELECT COUNT(*) FROM fragrances WHERE is_discontinued=1").fetchone()[0]
    limited    = db.execute("SELECT COUNT(*) FROM fragrances WHERE is_limited_edition=1").fetchone()[0]

    accords    = db.execute("""
        SELECT note_name, COUNT(*) as cnt
        FROM fragrance_notes WHERE note_position='accord'
        GROUP BY note_name ORDER BY cnt DESC LIMIT 10
    """).fetchall()

    by_conc    = db.execute("""
        SELECT concentration, COUNT(*) as cnt
        FROM fragrances WHERE concentration IS NOT NULL
        GROUP BY concentration ORDER BY cnt DESC
    """).fetchall()

    by_decade  = db.execute("""
        SELECT (year_released/10)*10 as decade, COUNT(*) as cnt
        FROM fragrances WHERE year_released IS NOT NULL
        GROUP BY decade ORDER BY decade
    """).fetchall()

    by_gender  = db.execute("""
        SELECT gender_class, COUNT(*) as cnt
        FROM fragrances WHERE gender_class IS NOT NULL
        GROUP BY gender_class
    """).fetchall()

    return {
        "total": total, "enriched": enriched, "brands": brands,
        "testers": testers, "discontinued": disc, "limited": limited,
        "top_accords":   [{k: r[k] for k in r.keys()} for r in accords],
        "by_concentration": [{k: r[k] for k in r.keys()} for r in by_conc],
        "by_decade":     [{k: r[k] for k in r.keys()} for r in by_decade],
        "by_gender":     [{k: r[k] for k in r.keys()} for r in by_gender],
    }