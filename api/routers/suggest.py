"""
api/routers/suggest.py — Wear suggestion engine
"""
import json
import httpx
from fastapi import APIRouter, Depends, Query
from typing import Optional
from api.database import get_db, row_to_dict

router = APIRouter()

@router.get("")
def suggest_fragrance(
    occasion: Optional[str] = Query(None),   # casual / work / evening / date / gym / special
    lat:      Optional[float]= Query(None),
    lon:      Optional[float]= Query(None),
    db = Depends(get_db)
):
    # Get weather if coords provided
    weather = {}
    season  = None
    if lat and lon:
        try:
            resp = httpx.get(
                f"https://api.open-meteo.com/v1/forecast",
                params={
                    "latitude": lat, "longitude": lon,
                    "current": "temperature_2m,weathercode",
                    "temperature_unit": "fahrenheit"
                },
                timeout=5
            )
            if resp.status_code == 200:
                data     = resp.json().get("current", {})
                temp_f   = data.get("temperature_2m", 70)
                weather  = {"temp_f": temp_f, "code": data.get("weathercode", 0)}
                if temp_f >= 75:
                    season = "Summer"
                elif temp_f >= 55:
                    season = "Spring"
                elif temp_f >= 40:
                    season = "Fall"
                else:
                    season = "Winter"
        except Exception:
            pass

    # Build candidate query
    q = """
        SELECT f.*,
               (SELECT COUNT(*) FROM wear_log w
                WHERE w.fragrance_id = f.id
                AND w.worn_date >= date('now', '-30 days')) as recent_wears
        FROM fragrances f
        WHERE f.enrichment_status = 'success'
          AND f.is_discontinued = 0
    """
    params = []

    if season:
        q += " AND f.season_tags LIKE ?"
        params.append(f"%{season}%")

    if occasion:
        occ_map = {
            "work":    "Professional",
            "evening": "Night Out",
            "date":    "Night Out",
            "casual":  "Casual",
            "gym":     "Casual",
            "special": "Night Out",
        }
        mapped = occ_map.get(occasion.lower())
        if mapped:
            q += " AND f.occasion_tags LIKE ?"
            params.append(f"%{mapped}%")

    q += " ORDER BY recent_wears ASC, RANDOM() LIMIT 20"
    candidates = db.execute(q, params).fetchall()

    if not candidates:
        # Fallback: any enriched, non-discontinued
        candidates = db.execute("""
            SELECT f.*,
                   (SELECT COUNT(*) FROM wear_log w
                    WHERE w.fragrance_id = f.id
                    AND w.worn_date >= date('now', '-30 days')) as recent_wears
            FROM fragrances f
            WHERE f.enrichment_status = 'success' AND f.is_discontinued = 0
            ORDER BY recent_wears ASC, RANDOM() LIMIT 20
        """).fetchall()

    if not candidates:
        return {"suggestion": None, "alternates": [], "weather": weather}

    primary    = row_to_dict(candidates[0])
    alternates = [row_to_dict(r) for r in candidates[1:3]]

    return {
        "suggestion":  primary,
        "alternates":  alternates,
        "weather":     weather,
        "season":      season,
        "occasion":    occasion,
    }
