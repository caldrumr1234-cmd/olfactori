from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from api.database import get_db

router = APIRouter()


def row_to_dict(r):
    return {k: r[k] for k in r.keys()}


# ── Models ────────────────────────────────────────────────────────────────────

class ShelfIn(BaseModel):
    name: str
    color: Optional[str] = "#7aabff"
    icon: Optional[str] = "🧴"


class ShelfUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None


class ReorderShelvesIn(BaseModel):
    ordered_ids: List[int]


class AssignFragrancesIn(BaseModel):
    fragrance_ids: List[int]


class ReorderFragrancesIn(BaseModel):
    ordered_fragrance_ids: List[int]


# ── Shelves CRUD ──────────────────────────────────────────────────────────────

@router.get("")
def list_shelves(db=Depends(get_db)):
    shelves = db.execute(
        "SELECT * FROM shelves ORDER BY sort_order, id"
    ).fetchall()
    result = []
    for shelf in shelves:
        s = row_to_dict(shelf)
        frags = db.execute("""
            SELECT f.id, f.name, f.brand, f.fragella_image_url, f.custom_image_url,
                   sf.sort_order
            FROM shelf_fragrances sf
            JOIN fragrances f ON f.id = sf.fragrance_id
            WHERE sf.shelf_id = ?
            ORDER BY sf.sort_order, sf.fragrance_id
        """, (s["id"],)).fetchall()
        s["fragrances"] = [row_to_dict(r) for r in frags]
        result.append(s)
    return result


@router.post("")
def create_shelf(payload: ShelfIn, db=Depends(get_db)):
    try:
        max_order = db.execute("SELECT COALESCE(MAX(sort_order), -1) FROM shelves").fetchone()[0]
        cur = db.execute(
            "INSERT INTO shelves (name, color, icon, sort_order) VALUES (?, ?, ?, ?)",
            (payload.name, payload.color, payload.icon, max_order + 1)
        )
        db.commit()
        row = db.execute("SELECT * FROM shelves WHERE id = ?", (cur.lastrowid,)).fetchone()
        s = row_to_dict(row)
        s["fragrances"] = []
        return s
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{shelf_id}")
def update_shelf(shelf_id: int, payload: ShelfUpdate, db=Depends(get_db)):
    existing = db.execute("SELECT * FROM shelves WHERE id = ?", (shelf_id,)).fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Shelf not found")
    fields = {}
    if payload.name is not None:
        fields["name"] = payload.name
    if payload.color is not None:
        fields["color"] = payload.color
    if payload.icon is not None:
        fields["icon"] = payload.icon
    if fields:
        set_clause = ", ".join(f"{k} = ?" for k in fields)
        db.execute(f"UPDATE shelves SET {set_clause} WHERE id = ?",
                   (*fields.values(), shelf_id))
        db.commit()
    row = db.execute("SELECT * FROM shelves WHERE id = ?", (shelf_id,)).fetchone()
    s = row_to_dict(row)
    frags = db.execute("""
        SELECT f.id, f.name, f.brand, f.fragella_image_url, f.custom_image_url, sf.sort_order
        FROM shelf_fragrances sf
        JOIN fragrances f ON f.id = sf.fragrance_id
        WHERE sf.shelf_id = ?
        ORDER BY sf.sort_order, sf.fragrance_id
    """, (shelf_id,)).fetchall()
    s["fragrances"] = [row_to_dict(r) for r in frags]
    return s


@router.delete("/{shelf_id}")
def delete_shelf(shelf_id: int, db=Depends(get_db)):
    existing = db.execute("SELECT id FROM shelves WHERE id = ?", (shelf_id,)).fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Shelf not found")
    db.execute("DELETE FROM shelf_fragrances WHERE shelf_id = ?", (shelf_id,))
    db.execute("DELETE FROM shelves WHERE id = ?", (shelf_id,))
    db.commit()
    return {"deleted": shelf_id}


# ── Shelf reorder ─────────────────────────────────────────────────────────────

@router.post("/reorder")
def reorder_shelves(payload: ReorderShelvesIn, db=Depends(get_db)):
    for i, shelf_id in enumerate(payload.ordered_ids):
        db.execute("UPDATE shelves SET sort_order = ? WHERE id = ?", (i, shelf_id))
    db.commit()
    return {"reordered": True}


# ── Fragrance assignment ──────────────────────────────────────────────────────

@router.put("/{shelf_id}/fragrances")
def set_shelf_fragrances(shelf_id: int, payload: AssignFragrancesIn, db=Depends(get_db)):
    """Replace the full fragrance list for a shelf."""
    existing = db.execute("SELECT id FROM shelves WHERE id = ?", (shelf_id,)).fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Shelf not found")
    db.execute("DELETE FROM shelf_fragrances WHERE shelf_id = ?", (shelf_id,))
    for i, frag_id in enumerate(payload.fragrance_ids):
        db.execute(
            "INSERT OR IGNORE INTO shelf_fragrances (shelf_id, fragrance_id, sort_order) VALUES (?, ?, ?)",
            (shelf_id, frag_id, i)
        )
    db.commit()
    frags = db.execute("""
        SELECT f.id, f.name, f.brand, f.fragella_image_url, f.custom_image_url, sf.sort_order
        FROM shelf_fragrances sf
        JOIN fragrances f ON f.id = sf.fragrance_id
        WHERE sf.shelf_id = ?
        ORDER BY sf.sort_order, sf.fragrance_id
    """, (shelf_id,)).fetchall()
    return [row_to_dict(r) for r in frags]


@router.delete("/{shelf_id}/fragrances/{fragrance_id}")
def remove_fragrance_from_shelf(shelf_id: int, fragrance_id: int, db=Depends(get_db)):
    db.execute(
        "DELETE FROM shelf_fragrances WHERE shelf_id = ? AND fragrance_id = ?",
        (shelf_id, fragrance_id)
    )
    db.commit()
    return {"removed": fragrance_id}


@router.post("/{shelf_id}/fragrances/reorder")
def reorder_shelf_fragrances(shelf_id: int, payload: ReorderFragrancesIn, db=Depends(get_db)):
    for i, frag_id in enumerate(payload.ordered_fragrance_ids):
        db.execute(
            "UPDATE shelf_fragrances SET sort_order = ? WHERE shelf_id = ? AND fragrance_id = ?",
            (i, shelf_id, frag_id)
        )
    db.commit()
    return {"reordered": True}
