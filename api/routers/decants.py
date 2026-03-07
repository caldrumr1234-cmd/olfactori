"""
api/routers/decants.py — Decants & Samples inventory
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from api.database import get_db

router = APIRouter()

def row_to_dict(r):
    return {k: r[k] for k in r.keys()}

class DecantIn(BaseModel):
    type:          str            # 'decant' or 'sample'
    brand:         str
    name:          str
    concentration: Optional[str]  = None
    size_ml:       Optional[float]= None
    quantity:      Optional[int]  = 1
    notes:         Optional[str]  = None

class DecantUpdate(BaseModel):
    type:          Optional[str]  = None
    brand:         Optional[str]  = None
    name:          Optional[str]  = None
    concentration: Optional[str]  = None
    size_ml:       Optional[float]= None
    quantity:      Optional[int]  = None
    notes:         Optional[str]  = None

@router.get("")
def list_decants(
    type:   Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db = Depends(get_db)
):
    q = "SELECT * FROM decants WHERE 1=1"
    params = []
    if type:
        q += " AND type = ?"
        params.append(type)
    if search:
        q += " AND (brand LIKE ? OR name LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%"])
    q += " ORDER BY brand, name"
    rows = db.execute(q, params).fetchall()
    items = [row_to_dict(r) for r in rows]

    # Check which ones exist in main collection
    for item in items:
        match = db.execute(
            "SELECT id FROM fragrances WHERE LOWER(brand)=LOWER(?) AND LOWER(name)=LOWER(?)",
            (item["brand"], item["name"])
        ).fetchone()
        item["in_collection"] = match["id"] if match else None

    return {"items": items}

@router.post("")
def add_decant(data: DecantIn, db = Depends(get_db)):
    cur = db.execute("""
        INSERT INTO decants (type, brand, name, concentration, size_ml, quantity, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        data.type, data.brand, data.name,
        data.concentration, data.size_ml,
        data.quantity or 1, data.notes
    ))
    db.commit()
    row = db.execute("SELECT * FROM decants WHERE id=?", (cur.lastrowid,)).fetchone()
    return row_to_dict(row)

@router.patch("/{item_id}")
def update_decant(item_id: int, data: DecantUpdate, db = Depends(get_db)):
    row = db.execute("SELECT * FROM decants WHERE id=?", (item_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Not found")
    current = row_to_dict(row)
    fields = data.dict(exclude_unset=True)
    for k, v in fields.items():
        current[k] = v
    db.execute("""
        UPDATE decants SET type=?, brand=?, name=?, concentration=?,
        size_ml=?, quantity=?, notes=? WHERE id=?
    """, (
        current["type"], current["brand"], current["name"],
        current["concentration"], current["size_ml"],
        current["quantity"], current["notes"], item_id
    ))
    db.commit()
    return row_to_dict(db.execute("SELECT * FROM decants WHERE id=?", (item_id,)).fetchone())

@router.delete("/{item_id}")
def delete_decant(item_id: int, db = Depends(get_db)):
    db.execute("DELETE FROM decants WHERE id=?", (item_id,))
    db.commit()
    return {"deleted": item_id}
