"""
api/routers/decants.py
Schema: id, type, brand, name, concentration, size_ml, quantity, notes, created_at
        + fragrance_id, volume_remaining_ml, source, custom_image_url, fragrantica_url
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from api.database import get_db

router = APIRouter()


def row_to_dict(r):
    return {k: r[k] for k in r.keys()}


FULL_SELECT = """
    SELECT d.id,
           d.fragrance_id,
           CASE WHEN d.fragrance_id IS NOT NULL THEN COALESCE(f.name,  d.name)  ELSE d.name  END AS fragrance_name,
           CASE WHEN d.fragrance_id IS NOT NULL THEN COALESCE(f.brand, d.brand) ELSE d.brand END AS fragrance_brand,
           COALESCE(d.custom_image_url,   f.custom_image_url,   f.r2_image_url, f.fragella_image_url) AS image_url,
           COALESCE(d.fragrantica_url,    f.fragrantica_url)    AS fragrantica_url,
           d.type, d.concentration,
           d.size_ml, d.volume_remaining_ml,
           d.quantity, d.source, d.notes, d.created_at
    FROM decants d
    LEFT JOIN fragrances f ON f.id = d.fragrance_id
"""


class DecantIn(BaseModel):
    fragrance_id:        Optional[int]   = None
    brand:               Optional[str]   = None
    name:                Optional[str]   = None
    concentration:       Optional[str]   = None
    type:                Optional[str]   = "decant"
    size_ml:             Optional[float] = None
    volume_remaining_ml: Optional[float] = None
    quantity:            Optional[int]   = 1
    source:              Optional[str]   = None
    notes:               Optional[str]   = None
    custom_image_url:    Optional[str]   = None
    fragrantica_url:     Optional[str]   = None


class DecantUpdate(BaseModel):
    size_ml:             Optional[float] = None
    volume_remaining_ml: Optional[float] = None
    source:              Optional[str]   = None
    notes:               Optional[str]   = None
    quantity:            Optional[int]   = None
    custom_image_url:    Optional[str]   = None
    fragrantica_url:     Optional[str]   = None


@router.get("")
def list_decants(db=Depends(get_db)):
    rows = db.execute(FULL_SELECT + " ORDER BY fragrance_brand, fragrance_name").fetchall()
    return [row_to_dict(r) for r in rows]


@router.post("")
def create_decant(payload: DecantIn, db=Depends(get_db)):
    brand = payload.brand
    name  = payload.name
    if payload.fragrance_id:
        row = db.execute("SELECT brand, name FROM fragrances WHERE id=?",
                         (payload.fragrance_id,)).fetchone()
        if row:
            brand = row["brand"]
            name  = row["name"]

    if not name:
        raise HTTPException(400, "name or fragrance_id required")

    cur = db.execute("""
        INSERT INTO decants
            (fragrance_id, brand, name, concentration, type,
             size_ml, volume_remaining_ml, quantity, source, notes,
             custom_image_url, fragrantica_url)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    """, (
        payload.fragrance_id, brand or "", name,
        payload.concentration, payload.type or "decant",
        payload.size_ml, payload.volume_remaining_ml,
        payload.quantity or 1, payload.source, payload.notes,
        payload.custom_image_url, payload.fragrantica_url,
    ))
    db.commit()
    row = db.execute(FULL_SELECT + " WHERE d.id = ?", (cur.lastrowid,)).fetchone()
    return row_to_dict(row)


@router.patch("/{decant_id}")
def update_decant(decant_id: int, payload: DecantUpdate, db=Depends(get_db)):
    existing = db.execute("SELECT id FROM decants WHERE id=?", (decant_id,)).fetchone()
    if not existing:
        raise HTTPException(404, "Decant not found")

    fields = {}
    for attr in ("size_ml", "volume_remaining_ml", "source", "notes", "quantity",
                 "custom_image_url", "fragrantica_url"):
        val = getattr(payload, attr)
        if val is not None:
            fields[attr] = val

    if fields:
        set_clause = ", ".join(f"{k}=?" for k in fields)
        db.execute(f"UPDATE decants SET {set_clause} WHERE id=?",
                   (*fields.values(), decant_id))
        db.commit()

    row = db.execute(FULL_SELECT + " WHERE d.id = ?", (decant_id,)).fetchone()
    return row_to_dict(row)


@router.delete("/{decant_id}")
def delete_decant(decant_id: int, db=Depends(get_db)):
    existing = db.execute("SELECT id FROM decants WHERE id=?", (decant_id,)).fetchone()
    if not existing:
        raise HTTPException(404, "Decant not found")
    db.execute("DELETE FROM decants WHERE id=?", (decant_id,))
    db.commit()
    return {"deleted": decant_id}
