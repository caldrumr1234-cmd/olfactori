"""
api/routers/wishlist.py
"""
import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from api.database import get_db, row_to_dict, rows_to_list

router = APIRouter()

class WishlistItem(BaseModel):
    brand:           str
    name:            str
    concentration:   Optional[str]   = None
    size_ml:         Optional[float] = None
    notes:           Optional[str]   = None
    priority:        Optional[int]   = 3
    target_price:    Optional[float] = None
    fragrantica_url: Optional[str]   = None
    image_url:       Optional[str]   = None

@router.get("/")
def get_wishlist(db = Depends(get_db)):
    rows = db.execute(
        "SELECT * FROM wishlist WHERE is_purchased=0 ORDER BY priority ASC, added_at DESC"
    ).fetchall()
    return rows_to_list(rows)

@router.post("/")
def add_to_wishlist(item: WishlistItem, db = Depends(get_db)):
    cur = db.execute("""
        INSERT INTO wishlist (brand, name, concentration, size_ml, notes,
                              priority, target_price, fragrantica_url, image_url)
        VALUES (?,?,?,?,?,?,?,?,?)
    """, (item.brand, item.name, item.concentration, item.size_ml,
          item.notes, item.priority, item.target_price,
          item.fragrantica_url, item.image_url))
    db.commit()
    return row_to_dict(db.execute("SELECT * FROM wishlist WHERE id=?", (cur.lastrowid,)).fetchone())

@router.patch("/{item_id}/purchased")
def mark_purchased(item_id: int, db = Depends(get_db)):
    db.execute(
        "UPDATE wishlist SET is_purchased=1, purchased_at=datetime('now') WHERE id=?",
        (item_id,)
    )
    db.commit()
    return {"purchased": True}

@router.delete("/{item_id}")
def remove_wishlist(item_id: int, db = Depends(get_db)):
    db.execute("DELETE FROM wishlist WHERE id=?", (item_id,))
    db.commit()
    return {"deleted": True}
