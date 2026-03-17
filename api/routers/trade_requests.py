from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from api.database import get_db

router = APIRouter()

class TradeRequestIn(BaseModel):
    fragrance_id: int
    fragrance_name: str
    fragrance_brand: str
    requester_name:  Optional[str] = None   # filled from JWT if not provided
    requester_email: Optional[str] = None
    offering: Optional[str] = None
    message: Optional[str] = None

class TradeStatusUpdate(BaseModel):
    status: str  # pending | accepted | declined

@router.post("")
def create_trade_request(body: TradeRequestIn, request: Request, db=Depends(get_db)):
    from api.routers.auth import get_current_user
    requester_name  = body.requester_name
    requester_email = body.requester_email
    user = get_current_user(request)
    if user:
        email = user.get("email", "").lower()
        friend = db.execute(
            "SELECT * FROM friend_invites WHERE LOWER(email)=? AND is_active=1", (email,)
        ).fetchone()
        if friend:
            requester_name  = requester_name  or friend["name"]
            requester_email = requester_email or email
    if not requester_name or not requester_email:
        raise HTTPException(400, "Requester name and email are required")
    db.execute("""
        INSERT INTO trade_requests
            (fragrance_id, fragrance_name, fragrance_brand,
             requester_name, requester_email, offering, message, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', date('now'))
    """, (
        body.fragrance_id, body.fragrance_name, body.fragrance_brand,
        requester_name, requester_email,
        body.offering, body.message,
    ))
    db.commit()
    return {"ok": True}

@router.get("")
def list_trade_requests(db=Depends(get_db)):
    rows = db.execute("""
        SELECT * FROM trade_requests ORDER BY created_at DESC
    """).fetchall()
    return [{k: r[k] for k in r.keys()} for r in rows]

@router.patch("/{req_id}")
def update_trade_request(req_id: int, body: TradeStatusUpdate, db=Depends(get_db)):
    if body.status not in ("pending", "accepted", "declined"):
        raise HTTPException(status_code=400, detail="Invalid status")
    db.execute(
        "UPDATE trade_requests SET status = ? WHERE id = ?",
        (body.status, req_id)
    )
    db.commit()
    return {"ok": True}

@router.delete("/{req_id}")
def delete_trade_request(req_id: int, db=Depends(get_db)):
    db.execute("DELETE FROM trade_requests WHERE id = ?", (req_id,))
    db.commit()
    return {"ok": True}
