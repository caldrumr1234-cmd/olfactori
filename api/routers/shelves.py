"""
api/routers/shelves.py — Custom shelves / groupings
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from api.database import get_db

router = APIRouter()

class ShelfCreate(BaseModel):
    name: str
    description: Optional[str] = None
    emoji: Optional[str] = None

class ShelfUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    emoji: Optional[str] = None

def ensure_tables(db):
    db.execute("""
        CREATE TABLE IF NOT EXISTS shelves (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            emoji TEXT DEFAULT '🗄️',
            created_at TEXT DEFAULT (date('now'))
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS shelf_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            shelf_id INTEGER NOT NULL REFERENCES shelves(id) ON DELETE CASCADE,
            fragrance_id INTEGER NOT NULL REFERENCES fragrances(id) ON DELETE CASCADE,
            added_at TEXT DEFAULT (date('now')),
            UNIQUE(shelf_id, fragrance_id)
        )
    """)
    db.commit()

# ── SHELVES CRUD ──────────────────────────────────────────────

@router.get("")
def list_shelves(db = Depends(get_db)):
    ensure_tables(db)
    rows = db.execute("""
        SELECT s.id, s.name, s.description, s.emoji, s.created_at,
               COUNT(si.fragrance_id) as item_count
        FROM shelves s
        LEFT JOIN shelf_items si ON si.shelf_id = s.id
        GROUP BY s.id ORDER BY s.name
    """).fetchall()
    return {"shelves": [{k: r[k] for k in r.keys()} for r in rows]}

@router.post("")
def create_shelf(body: ShelfCreate, db = Depends(get_db)):
    ensure_tables(db)
    cur = db.execute(
        "INSERT INTO shelves (name, description, emoji) VALUES (?, ?, ?)",
        (body.name, body.description, body.emoji or "🗄️")
    )
    db.commit()
    row = db.execute("SELECT * FROM shelves WHERE id = ?", (cur.lastrowid,)).fetchone()
    return {k: row[k] for k in row.keys()}

@router.patch("/{shelf_id}")
def update_shelf(shelf_id: int, body: ShelfUpdate, db = Depends(get_db)):
    ensure_tables(db)
    shelf = db.execute("SELECT * FROM shelves WHERE id = ?", (shelf_id,)).fetchone()
    if not shelf:
        raise HTTPException(status_code=404, detail="Shelf not found")
    fields, vals = [], []
    if body.name        is not None: fields.append("name = ?");        vals.append(body.name)
    if body.description is not None: fields.append("description = ?"); vals.append(body.description)
    if body.emoji       is not None: fields.append("emoji = ?");       vals.append(body.emoji)
    if fields:
        vals.append(shelf_id)
        db.execute(f"UPDATE shelves SET {', '.join(fields)} WHERE id = ?", vals)
        db.commit()
    row = db.execute("SELECT * FROM shelves WHERE id = ?", (shelf_id,)).fetchone()
    return {k: row[k] for k in row.keys()}

@router.delete("/{shelf_id}")
def delete_shelf(shelf_id: int, db = Depends(get_db)):
    ensure_tables(db)
    db.execute("DELETE FROM shelves WHERE id = ?", (shelf_id,))
    db.commit()
    return {"deleted": shelf_id}

# ── SHELF ITEMS ───────────────────────────────────────────────

@router.get("/{shelf_id}/items")
def get_shelf_items(shelf_id: int, db = Depends(get_db)):
    ensure_tables(db)
    rows = db.execute("""
        SELECT f.id, f.brand, f.name, f.concentration, f.main_accords,
               f.fragella_image_url, f.custom_image_url, f.personal_rating,
               f.is_discontinued, si.added_at
        FROM shelf_items si
        JOIN fragrances f ON f.id = si.fragrance_id
        WHERE si.shelf_id = ?
        ORDER BY f.brand, f.name
    """, (shelf_id,)).fetchall()
    return {"items": [{k: r[k] for k in r.keys()} for r in rows]}

@router.post("/{shelf_id}/items")
def add_items_to_shelf(shelf_id: int, body: dict, db = Depends(get_db)):
    """Add one or more fragrance IDs to a shelf. Body: {fragrance_ids: [1,2,3]}"""
    ensure_tables(db)
    shelf = db.execute("SELECT id FROM shelves WHERE id = ?", (shelf_id,)).fetchone()
    if not shelf:
        raise HTTPException(status_code=404, detail="Shelf not found")
    ids = body.get("fragrance_ids", [])
    added = 0
    for fid in ids:
        try:
            db.execute("INSERT OR IGNORE INTO shelf_items (shelf_id, fragrance_id) VALUES (?, ?)", (shelf_id, fid))
            added += 1
        except Exception:
            pass
    db.commit()
    return {"added": added, "shelf_id": shelf_id}

@router.delete("/{shelf_id}/items/{fragrance_id}")
def remove_item_from_shelf(shelf_id: int, fragrance_id: int, db = Depends(get_db)):
    ensure_tables(db)
    db.execute("DELETE FROM shelf_items WHERE shelf_id = ? AND fragrance_id = ?", (shelf_id, fragrance_id))
    db.commit()
    return {"removed": fragrance_id, "shelf_id": shelf_id}

@router.get("/by_fragrance/{fragrance_id}")
def shelves_for_fragrance(fragrance_id: int, db = Depends(get_db)):
    """Which shelves does this fragrance belong to?"""
    ensure_tables(db)
    rows = db.execute("""
        SELECT s.id, s.name, s.emoji FROM shelves s
        JOIN shelf_items si ON si.shelf_id = s.id
        WHERE si.fragrance_id = ?
        ORDER BY s.name
    """, (fragrance_id,)).fetchall()
    return {"shelves": [{k: r[k] for k in r.keys()} for r in rows]}
