"""
api/routers/insights.py — Olfactory DNA, gaps, radar, timeline, map
"""
import json
from fastapi import APIRouter, Depends
from api.database import get_db

router = APIRouter()

@router.get("/dna")
def olfactory_dna(db = Depends(get_db)):
    """Your scent profile — signature accords, preferred houses, decade bias."""
    top_accords = db.execute("""
        SELECT note_name, COUNT(*) as cnt
        FROM fragrance_notes WHERE note_position='accord'
        GROUP BY note_name ORDER BY cnt DESC LIMIT 8
    """).fetchall()

    top_notes = db.execute("""
        SELECT note_name, COUNT(*) as cnt
        FROM fragrance_notes WHERE note_position IN ('top','middle','base')
        GROUP BY note_name ORDER BY cnt DESC LIMIT 15
    """).fetchall()

    top_brands = db.execute("""
        SELECT brand, COUNT(*) as cnt FROM fragrances
        GROUP BY brand ORDER BY cnt DESC LIMIT 8
    """).fetchall()

    decade_bias = db.execute("""
        SELECT (year_released/10)*10 as decade, COUNT(*) as cnt
        FROM fragrances WHERE year_released IS NOT NULL
        GROUP BY decade ORDER BY cnt DESC LIMIT 1
    """).fetchone()

    seasons = db.execute("""
        SELECT note_name as season, COUNT(*) as cnt
        FROM fragrance_notes WHERE note_position='accord'
        AND note_name IN ('Spring','Summer','Fall','Winter')
        GROUP BY note_name ORDER BY cnt DESC
    """).fetchall()

    total = db.execute("SELECT COUNT(*) FROM fragrances").fetchone()[0]

    return {
        "total_bottles":  total,
        "top_accords":    [dict(r) for r in top_accords],
        "top_notes":      [dict(r) for r in top_notes],
        "top_brands":     [dict(r) for r in top_brands],
        "peak_decade":    dict(decade_bias) if decade_bias else None,
        "season_balance": [dict(r) for r in seasons],
    }

@router.get("/gaps")
def gap_finder(db = Depends(get_db)):
    """Accords you have none or very few of."""
    all_accords = [
        "floral", "woody", "oriental", "fresh", "citrus", "aquatic",
        "gourmand", "chypre", "fougere", "leather", "green", "spicy",
        "amber", "musky", "powdery", "earthy", "smoky", "oud"
    ]
    owned = {}
    for acc in all_accords:
        count = db.execute("""
            SELECT COUNT(DISTINCT fragrance_id) FROM fragrance_notes
            WHERE note_position='accord' AND note_name LIKE ?
        """, (f"%{acc}%",)).fetchone()[0]
        owned[acc] = count

    gaps = [
        {"accord": acc, "count": owned[acc]}
        for acc in all_accords if owned[acc] < 2
    ]
    gaps.sort(key=lambda x: x["count"])
    return {"gaps": gaps, "owned_accords": owned}

@router.get("/redundancy")
def redundancy_radar(db = Depends(get_db)):
    """Groups of very similar fragrances you might not need all of."""
    rows = db.execute("""
        SELECT f.id, f.brand, f.name, f.main_accords, f.top_notes, f.middle_notes, f.base_notes
        FROM fragrances f WHERE f.enrichment_status='success'
    """).fetchall()

    groups = {}
    for row in rows:
        try:
            accords = tuple(sorted(json.loads(row["main_accords"] or "[]")[:3]))
            if len(accords) >= 2:
                if accords not in groups:
                    groups[accords] = []
                groups[accords].append({"id": row["id"], "brand": row["brand"], "name": row["name"]})
        except Exception:
            pass

    redundant = [
        {"accords": list(k), "fragrances": v}
        for k, v in groups.items() if len(v) >= 3
    ]
    redundant.sort(key=lambda x: len(x["fragrances"]), reverse=True)
    return {"groups": redundant[:10]}

@router.get("/timeline")
def vintage_timeline(db = Depends(get_db)):
    """All fragrances plotted by release year."""
    rows = db.execute("""
        SELECT id, brand, name, year_released, main_accords,
               fragella_image_url, custom_image_url, personal_rating
        FROM fragrances WHERE year_released IS NOT NULL
        ORDER BY year_released ASC
    """).fetchall()
    return {"fragrances": [dict(r) for r in rows]}

@router.get("/map")
def collection_map(db = Depends(get_db)):
    """Country of origin for each house."""
    rows = db.execute("""
        SELECT brand, country_of_origin, COUNT(*) as bottle_count
        FROM fragrances
        WHERE country_of_origin IS NOT NULL
        GROUP BY brand, country_of_origin
        ORDER BY bottle_count DESC
    """).fetchall()
    return {"brands": [dict(r) for r in rows]}

@router.get("/neglected")
def most_neglected(db = Depends(get_db)):
    """Fragrances not worn in 6+ months."""
    rows = db.execute("""
        SELECT f.id, f.brand, f.name, f.last_worn_date,
               f.fragella_image_url, f.custom_image_url,
               julianday('now') - julianday(COALESCE(f.last_worn_date, '2000-01-01')) as days_since
        FROM fragrances f
        WHERE f.is_discontinued = 0
          AND (f.last_worn_date IS NULL OR f.last_worn_date < date('now', '-180 days'))
        ORDER BY days_since DESC
        LIMIT 20
    """).fetchall()
    return {"neglected": [dict(r) for r in rows]}

@router.get("/stats")
def get_stats(db = Depends(get_db)):
    total    = db.execute("SELECT COUNT(*) FROM fragrances").fetchone()[0]
    enriched = db.execute("SELECT COUNT(*) FROM fragrances WHERE enrichment_status='success'").fetchone()[0]
    brands   = db.execute("SELECT COUNT(DISTINCT brand) FROM fragrances").fetchone()[0]
    by_conc  = db.execute("""
        SELECT concentration, COUNT(*) as cnt FROM fragrances
        WHERE concentration IS NOT NULL GROUP BY concentration ORDER BY cnt DESC
    """).fetchall()
    by_decade = db.execute("""
        SELECT (year_released/10)*10 as decade, COUNT(*) as cnt
        FROM fragrances WHERE year_released IS NOT NULL
        GROUP BY decade ORDER BY decade
    """).fetchall()
    return {
        "total": total, "enriched": enriched, "brands": brands,
        "by_concentration": [dict(r) for r in by_conc],
        "by_decade": [dict(r) for r in by_decade],
    }

@router.get("/seasonal_balance")
def seasonal_balance(db = Depends(get_db)):
    """How balanced is your collection across seasons?"""
    seasons = ["Spring", "Summer", "Fall", "Winter"]
    result = {}
    total = db.execute("SELECT COUNT(*) FROM fragrances WHERE enrichment_status='success'").fetchone()[0]
    for season in seasons:
        count = db.execute("""
            SELECT COUNT(*) FROM fragrances
            WHERE season_tags LIKE ? AND enrichment_status='success'
        """, (f"%{season}%",)).fetchone()[0]
        result[season] = {"count": count, "pct": round(count/total*100, 1) if total else 0}
    return {"seasons": result, "total": total}
