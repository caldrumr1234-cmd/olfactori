from fastapi import APIRouter, Depends, HTTPException
from api.database import get_db

router = APIRouter()

@router.get("/{username}")
def get_share_profile(username: str, db=Depends(get_db)):
    profile = db.execute(
        "SELECT * FROM share_profiles WHERE username = ?", (username,)
    ).fetchone()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    if not profile["enabled"]:
        raise HTTPException(status_code=404, detail="Profile not found")

    fragrances = db.execute("""
        SELECT id, brand, name, concentration, size_ml, year_released,
               perfumer, top_notes, middle_notes, base_notes,
               fragella_image_url, custom_image_url,
               want_to_trade, want_to_sell, want_to_give_away,
               is_tester, is_limited_edition, is_exclusive, is_discontinued,
               rating, fragrantica_url
        FROM fragrances
        ORDER BY brand, name
    """).fetchall()

    return {
        "username": profile["username"],
        "display_name": profile["display_name"],
        "bio": profile["bio"],
        "show_notes": profile["show_notes"],
        "show_concentration": profile["show_concentration"],
        "show_size": profile["show_size"],
        "fragrances": [{k: row[k] for k in row.keys()} for row in fragrances],
    }

@router.get("/{username}/profile")
def get_profile_settings(username: str, db=Depends(get_db)):
    row = db.execute(
        "SELECT * FROM share_profiles WHERE username = ?", (username,)
    ).fetchone()
    if not row:
        return {"exists": False}
    return {k: row[k] for k in row.keys()}

@router.post("/{username}/profile")
def upsert_profile(username: str, body: dict, db=Depends(get_db)):
    existing = db.execute(
        "SELECT id FROM share_profiles WHERE username = ?", (username,)
    ).fetchone()
    if existing:
        db.execute("""
            UPDATE share_profiles SET
                display_name = ?, bio = ?, enabled = ?,
                show_notes = ?, show_concentration = ?, show_size = ?
            WHERE username = ?
        """, (
            body.get("display_name", username),
            body.get("bio", ""),
            1 if body.get("enabled", True) else 0,
            1 if body.get("show_notes", True) else 0,
            1 if body.get("show_concentration", True) else 0,
            1 if body.get("show_size", True) else 0,
            username,
        ))
    else:
        db.execute("""
            INSERT INTO share_profiles (username, display_name, bio, enabled,
                show_notes, show_concentration, show_size)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            username,
            body.get("display_name", username),
            body.get("bio", ""),
            1 if body.get("enabled", True) else 0,
            1 if body.get("show_notes", True) else 0,
            1 if body.get("show_concentration", True) else 0,
            1 if body.get("show_size", True) else 0,
        ))
    db.commit()
    return {"ok": True}
