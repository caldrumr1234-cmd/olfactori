"""
decants.py — full replacement
Adds volume_remaining_ml to PATCH and GET responses.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from api.database import get_db

router = APIRouter()


def row_to_dict(r):
    return {k: r[k] for k in r.keys()}


class DecantIn(BaseModel):
    fragrance_id: int
    size_ml: Optional[float] = None
    volume_remaining_ml: Optional[float] = None
    source: Optional[str] = None
    notes: Optional[str] = None


class DecantUpdate(BaseModel):
    size_ml: Optional[float] = None
    volume_remaining_ml: Optional[float] = None
    source: Optional[str] = None
    notes: Optional[str] = None


@router.get("")
def list_decants(db=Depends(get_db)):
    rows = db.execute("""
        SELECT d.id, d.fragrance_id,
               COALESCE(f.name, 'Unknown')  AS fragrance_name,
               COALESCE(f.brand, '')         AS fragrance_brand,
               f.fragella_image_url, f.custom_image_url,
               d.size_ml, d.volume_remaining_ml,
               d.source, d.notes, d.created_at
        FROM decants d
        LEFT JOIN fragrances f ON f.id = d.fragrance_id
        ORDER BY f.brand, f.name
    """).fetchall()
    return [row_to_dict(r) for r in rows]


@router.post("")
def create_decant(payload: DecantIn, db=Depends(get_db)):
    cur = db.execute(
        """INSERT INTO decants (fragrance_id, size_ml, volume_remaining_ml, source, notes)
           VALUES (?, ?, ?, ?, ?)""",
        (payload.fragrance_id, payload.size_ml, payload.volume_remaining_ml,
         payload.source, payload.notes)
    )
    db.commit()
    row = db.execute("""
        SELECT d.id, d.fragrance_id,
               COALESCE(f.name,'Unknown') AS fragrance_name,
               COALESCE(f.brand,'')       AS fragrance_brand,
               f.fragella_image_url, f.custom_image_url,
               d.size_ml, d.volume_remaining_ml,
               d.source, d.notes, d.created_at
        FROM decants d
        LEFT JOIN fragrances f ON f.id = d.fragrance_id
        WHERE d.id = ?
    """, (cur.lastrowid,)).fetchone()
    return row_to_dict(row)


@router.patch("/{decant_id}")
def update_decant(decant_id: int, payload: DecantUpdate, db=Depends(get_db)):
    existing = db.execute("SELECT id FROM decants WHERE id = ?", (decant_id,)).fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Decant not found")

    fields = {}
    if payload.size_ml is not None:
        fields["size_ml"] = payload.size_ml
    if payload.volume_remaining_ml is not None:
        fields["volume_remaining_ml"] = payload.volume_remaining_ml
    if payload.source is not None:
        fields["source"] = payload.source
    if payload.notes is not None:
        fields["notes"] = payload.notes

    if fields:
        set_clause = ", ".join(f"{k} = ?" for k in fields)
        db.execute(f"UPDATE decants SET {set_clause} WHERE id = ?",
                   (*fields.values(), decant_id))
        db.commit()

    row = db.execute("""
        SELECT d.id, d.fragrance_id,
               COALESCE(f.name,'Unknown') AS fragrance_name,
               COALESCE(f.brand,'')       AS fragrance_brand,
               f.fragella_image_url, f.custom_image_url,
               d.size_ml, d.volume_remaining_ml,
               d.source, d.notes, d.created_at
        FROM decants d
        LEFT JOIN fragrances f ON f.id = d.fragrance_id
        WHERE d.id = ?
    """, (decant_id,)).fetchone()
    return row_to_dict(row)


@router.delete("/{decant_id}")
def delete_decant(decant_id: int, db=Depends(get_db)):
    existing = db.execute("SELECT id FROM decants WHERE id = ?", (decant_id,)).fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Decant not found")
    db.execute("DELETE FROM decants WHERE id = ?", (decant_id,))
    db.commit()
    return {"deleted": decant_id}
