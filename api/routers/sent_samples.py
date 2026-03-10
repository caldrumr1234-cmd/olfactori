from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import get_db

router = APIRouter()


class SentSampleIn(BaseModel):
    fragrance_id: int
    friend_name: str
    friend_email: Optional[str] = None
    notes: Optional[str] = None


def row_to_dict(r):
    return {k: r[k] for k in r.keys()}


@router.get("")
def list_sent_samples(db=Depends(get_db)):
    rows = db.execute("""
        SELECT
            ss.id,
            ss.fragrance_id,
            COALESCE(f.name, 'Unknown') AS fragrance_name,
            COALESCE(f.brand, '')        AS fragrance_brand,
            ss.friend_name,
            ss.friend_email,
            ss.notes,
            ss.sent_at
        FROM sent_samples ss
        LEFT JOIN fragrances f ON f.id = ss.fragrance_id
        ORDER BY ss.sent_at DESC, ss.id DESC
    """).fetchall()
    return [row_to_dict(r) for r in rows]


@router.post("")
def create_sent_sample(payload: SentSampleIn, db=Depends(get_db)):
    cur = db.execute(
        """INSERT INTO sent_samples (fragrance_id, friend_name, friend_email, notes)
           VALUES (?, ?, ?, ?)""",
        (payload.fragrance_id, payload.friend_name, payload.friend_email, payload.notes)
    )
    db.commit()
    row = db.execute(
        """SELECT ss.id, ss.fragrance_id,
                  COALESCE(f.name,'Unknown') AS fragrance_name,
                  COALESCE(f.brand,'')       AS fragrance_brand,
                  ss.friend_name, ss.friend_email, ss.notes, ss.sent_at
           FROM sent_samples ss
           LEFT JOIN fragrances f ON f.id = ss.fragrance_id
           WHERE ss.id = ?""",
        (cur.lastrowid,)
    ).fetchone()
    return row_to_dict(row)


@router.delete("/{sample_id}")
def delete_sent_sample(sample_id: int, db=Depends(get_db)):
    existing = db.execute("SELECT id FROM sent_samples WHERE id = ?", (sample_id,)).fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Not found")
    db.execute("DELETE FROM sent_samples WHERE id = ?", (sample_id,))
    db.commit()
    return {"deleted": sample_id}
