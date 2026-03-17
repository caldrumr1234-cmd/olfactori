"""
api/routers/friends.py — Friend invites + sample requests
"""
import json
import random
import secrets
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from api.database import get_db

router = APIRouter()

class InviteCreate(BaseModel):
    name:  str
    email: Optional[str] = None

class SampleRequest(BaseModel):
    token:         Optional[str] = None   # invite link token OR use JWT auth header
    fragrance_ids: list[int]
    message:       Optional[str] = None

class RequestStatus(BaseModel):
    status: str  # pending / sent / declined

# ── INVITES ───────────────────────────────────────────────────
@router.get("/invites")
def list_invites(db = Depends(get_db)):
    rows = db.execute(
        "SELECT * FROM friend_invites ORDER BY created_at DESC"
    ).fetchall()
    return [{k: r[k] for k in r.keys()} for r in rows]

@router.post("/invites")
def create_invite(data: InviteCreate, db = Depends(get_db)):
    token = secrets.token_urlsafe(8)
    pin   = str(random.randint(100000, 999999))
    cur = db.execute(
        "INSERT INTO friend_invites (name, email, token, pin) VALUES (?,?,?,?)",
        (data.name, data.email, token, pin)
    )
    db.commit()
    return {
        "id":    cur.lastrowid,
        "name":  data.name,
        "email": data.email,
        "token": token,
        "pin":   pin,
        "invite_url": f"/invite/{token}"
    }

@router.delete("/invites/{invite_id}")
def revoke_invite(invite_id: int, db = Depends(get_db)):
    """Soft-revoke: sets is_active=0"""
    db.execute("UPDATE friend_invites SET is_active=0 WHERE id=?", (invite_id,))
    db.commit()
    return {"revoked": True}

@router.delete("/invites/{invite_id}/delete")
def hard_delete_invite(invite_id: int, db = Depends(get_db)):
    """Hard delete: permanently removes invite row"""
    db.execute("DELETE FROM friend_invites WHERE id=?", (invite_id,))
    db.commit()
    return {"deleted": invite_id}

@router.post("/invites/{invite_id}/regenerate-pin")
def regenerate_pin(invite_id: int, db = Depends(get_db)):
    row = db.execute("SELECT id FROM friend_invites WHERE id=?", (invite_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Invite not found")
    new_pin = str(random.randint(100000, 999999))
    db.execute("UPDATE friend_invites SET pin=? WHERE id=?", (new_pin, invite_id))
    db.commit()
    return {"pin": new_pin}

@router.get("/invites/validate/{token}")
def validate_invite(token: str, db = Depends(get_db)):
    row = db.execute(
        "SELECT * FROM friend_invites WHERE token=? AND is_active=1", (token,)
    ).fetchone()
    if not row:
        raise HTTPException(403, "Invalid or expired invite link")
    db.execute(
        "UPDATE friend_invites SET last_seen=datetime('now') WHERE token=?", (token,)
    )
    db.commit()
    return {"valid": True, "name": row["name"], "friend_id": row["id"]}

# ── SAMPLE REQUESTS ───────────────────────────────────────────
@router.get("/requests")
def list_requests(status: Optional[str] = None, db = Depends(get_db)):
    q = """
        SELECT r.*, f.name as friend_name_lookup
        FROM sample_requests r
        LEFT JOIN friend_invites f ON f.id = r.friend_id
    """
    params = []
    if status:
        q += " WHERE r.status = ?"
        params.append(status)
    q += " ORDER BY r.created_at DESC"
    rows = db.execute(q, params).fetchall()
    results = []
    for row in rows:
        d = dict(row)
        try:
            d["fragrance_ids"]   = json.loads(d.get("fragrance_ids", "[]"))
            d["fragrance_names"] = json.loads(d.get("fragrance_names", "[]"))
        except Exception:
            pass
        results.append(d)
    return results

@router.post("/requests")
def create_request(data: SampleRequest, request: Request, db = Depends(get_db)):
    from api.routers.auth import get_current_user
    friend = None
    user = get_current_user(request)
    if user:
        email = user.get("email", "").lower()
        friend = db.execute(
            "SELECT * FROM friend_invites WHERE LOWER(email)=? AND is_active=1", (email,)
        ).fetchone()
    elif data.token:
        friend = db.execute(
            "SELECT * FROM friend_invites WHERE token=? AND is_active=1", (data.token,)
        ).fetchone()
    if not friend:
        raise HTTPException(403, "Authentication required or invalid invite token")

    names = []
    for fid in data.fragrance_ids:
        row = db.execute("SELECT brand, name FROM fragrances WHERE id=?", (fid,)).fetchone()
        if row:
            names.append(f"{row['brand']} — {row['name']}")

    cur = db.execute("""
        INSERT INTO sample_requests (friend_id, friend_name, fragrance_ids, fragrance_names, message)
        VALUES (?,?,?,?,?)
    """, (
        friend["id"],
        friend["name"],
        json.dumps(data.fragrance_ids),
        json.dumps(names),
        data.message
    ))
    db.commit()
    return {"id": cur.lastrowid, "status": "pending", "items": len(data.fragrance_ids)}

@router.patch("/requests/{req_id}")
def update_request_status(req_id: int, data: RequestStatus, db = Depends(get_db)):
    if data.status not in ("pending", "sent", "declined"):
        raise HTTPException(400, "Invalid status")
    db.execute(
        "UPDATE sample_requests SET status=?, updated_at=datetime('now') WHERE id=?",
        (data.status, req_id)
    )
    db.commit()
    return {"id": req_id, "status": data.status}

@router.get("/requests/pending_count")
def pending_count(db = Depends(get_db)):
    count = db.execute(
        "SELECT COUNT(*) FROM sample_requests WHERE status='pending'"
    ).fetchone()[0]
    return {"pending": count}
