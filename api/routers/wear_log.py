"""
api/routers/wear_log.py
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from api.database import get_db

router = APIRouter()

class WearEntry(BaseModel):
    fragrance_id: int
    worn_date:    str  # YYYY-MM-DD

@router.get("")
def get_wear_log(db = Depends(get_db)):
    rows = db.execute("""
        SELECT w.*, f.brand, f.name, f.fragella_image_url, f.custom_image_url
        FROM wear_log w JOIN fragrances f ON f.id = w.fragrance_id
        ORDER BY w.worn_date DESC LIMIT 100
    """).fetchall()
    return [{k: r[k] for k in r.keys()} for r in rows]

@router.post("")
def log_wear(entry: WearEntry, db = Depends(get_db)):
    row = db.execute("SELECT id FROM fragrances WHERE id=?", (entry.fragrance_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Fragrance not found")
    cur = db.execute(
        "INSERT INTO wear_log (fragrance_id, worn_date) VALUES (?,?)",
        (entry.fragrance_id, entry.worn_date)
    )
    db.execute(
        "UPDATE fragrances SET last_worn_date=? WHERE id=?",
        (entry.worn_date, entry.fragrance_id)
    )
    db.commit()
    return {"id": cur.lastrowid, "fragrance_id": entry.fragrance_id, "worn_date": entry.worn_date}

@router.delete("/{entry_id}")
def delete_wear(entry_id: int, db = Depends(get_db)):
    db.execute("DELETE FROM wear_log WHERE id=?", (entry_id,))
    db.commit()
    return {"deleted": True}

@router.get("/full")
def get_full_wear_log(offset: int = 0, limit: int = 50, db = Depends(get_db)):
    """Paginated full wear log."""
    total = db.execute("SELECT COUNT(*) FROM wear_log").fetchone()[0]
    rows = db.execute("""
        SELECT w.id, w.worn_date, f.id as fragrance_id, f.brand, f.name,
               f.fragella_image_url, f.custom_image_url
        FROM wear_log w JOIN fragrances f ON f.id = w.fragrance_id
        ORDER BY w.worn_date DESC
        LIMIT ? OFFSET ?
    """, (limit, offset)).fetchall()
    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "entries": [{k: r[k] for k in r.keys()} for r in rows]
    }
