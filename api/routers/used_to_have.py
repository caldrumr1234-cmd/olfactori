"""
api/routers/used_to_have.py — Fragrances you owned but no longer have
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from api.database import get_db

router = APIRouter()

REASONS = ["sold", "used up", "gifted", "lost", "returned", "other"]

class UsedToHaveCreate(BaseModel):
    brand: str
    name: str
    reason: Optional[str] = None
    notes: Optional[str] = None

class UsedToHaveUpdate(BaseModel):
    brand: Optional[str] = None
    name: Optional[str] = None
    reason: Optional[str] = None
    notes: Optional[str] = None

def ensure_table(db):
    db.execute("""
        CREATE TABLE IF NOT EXISTS used_to_have (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            brand TEXT NOT NULL,
            name TEXT NOT NULL,
            reason TEXT,
            notes TEXT,
            created_at TEXT DEFAULT (date('now'))
        )
    """)
    db.commit()

@router.get("")
def list_used_to_have(search: str = "", db = Depends(get_db)):
    ensure_table(db)
    if search:
        rows = db.execute("""
            SELECT * FROM used_to_have
            WHERE brand LIKE ? OR name LIKE ?
            ORDER BY brand, name
        """, (f"%{search}%", f"%{search}%")).fetchall()
    else:
        rows = db.execute("SELECT * FROM used_to_have ORDER BY brand, name").fetchall()
    return {"items": [{k: r[k] for k in r.keys()} for r in rows]}

@router.post("")
def add_used_to_have(body: UsedToHaveCreate, db = Depends(get_db)):
    ensure_table(db)
    cur = db.execute(
        "INSERT INTO used_to_have (brand, name, reason, notes) VALUES (?, ?, ?, ?)",
        (body.brand, body.name, body.reason, body.notes)
    )
    db.commit()
    row = db.execute("SELECT * FROM used_to_have WHERE id = ?", (cur.lastrowid,)).fetchone()
    return {k: row[k] for k in row.keys()}

@router.patch("/{item_id}")
def update_used_to_have(item_id: int, body: UsedToHaveUpdate, db = Depends(get_db)):
    ensure_table(db)
    item = db.execute("SELECT * FROM used_to_have WHERE id = ?", (item_id,)).fetchone()
    if not item:
        raise HTTPException(status_code=404, detail="Entry not found")
    fields, vals = [], []
    if body.brand  is not None: fields.append("brand = ?");  vals.append(body.brand)
    if body.name   is not None: fields.append("name = ?");   vals.append(body.name)
    if body.reason is not None: fields.append("reason = ?"); vals.append(body.reason)
    if body.notes  is not None: fields.append("notes = ?");  vals.append(body.notes)
    if fields:
        vals.append(item_id)
        db.execute(f"UPDATE used_to_have SET {', '.join(fields)} WHERE id = ?", vals)
        db.commit()
    row = db.execute("SELECT * FROM used_to_have WHERE id = ?", (item_id,)).fetchone()
    return {k: row[k] for k in row.keys()}

@router.delete("/{item_id}")
def delete_used_to_have(item_id: int, db = Depends(get_db)):
    ensure_table(db)
    db.execute("DELETE FROM used_to_have WHERE id = ?", (item_id,))
    db.commit()
    return {"deleted": item_id}

@router.get("/reasons")
def get_reasons():
    return {"reasons": REASONS}
