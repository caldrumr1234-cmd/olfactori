"""
api/routers/auth.py — Google OAuth + JWT session management
"""
import os, time, json, hashlib, hmac
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse, JSONResponse
from api.database import get_db
import httpx

router = APIRouter()

# ── CONFIG ────────────────────────────────────────────────────
GOOGLE_CLIENT_ID     = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
JWT_SECRET           = os.environ.get("JWT_SECRET", "change-me-in-production")
ADMIN_EMAIL          = os.environ.get("ADMIN_EMAIL", "")
FRONTEND_URL         = os.environ.get("FRONTEND_URL", "https://olfactori.vip")
BACKEND_URL          = os.environ.get("BACKEND_URL", "https://olfactori-production.up.railway.app")

GOOGLE_AUTH_URL  = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USER_URL  = "https://www.googleapis.com/oauth2/v2/userinfo"

# ── SIMPLE JWT (no external deps) ─────────────────────────────
import base64

def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

def _sign(payload: dict) -> str:
    header  = _b64(json.dumps({"alg":"HS256","typ":"JWT"}).encode())
    body    = _b64(json.dumps(payload).encode())
    sig     = _b64(hmac.new(JWT_SECRET.encode(), f"{header}.{body}".encode(), hashlib.sha256).digest())
    return f"{header}.{body}.{sig}"

def _verify(token: str) -> dict | None:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header, body, sig = parts
        expected = _b64(hmac.new(JWT_SECRET.encode(), f"{header}.{body}".encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(sig, expected):
            return None
        payload = json.loads(base64.urlsafe_b64decode(body + "=="))
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None

def issue_token(email: str) -> str:
    return _sign({
        "email": email,
        "role":  "admin" if email.lower() == ADMIN_EMAIL.lower() else "user",
        "iat":   int(time.time()),
        "exp":   int(time.time()) + 86400 * 30,  # 30 days
    })

def get_current_user(request: Request) -> dict | None:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return _verify(auth[7:])
    return None

def require_admin(request: Request):
    user = get_current_user(request)
    if not user or user.get("role") != "admin":
        raise HTTPException(401, "Admin access required")
    return user

# ── ROUTES ────────────────────────────────────────────────────
@router.get("/login")
def login(request: Request):
    """Redirect to Google OAuth consent screen."""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(500, "Google OAuth not configured")
    redirect_uri = f"{BACKEND_URL}/api/auth/callback"
    params = (
        f"client_id={GOOGLE_CLIENT_ID}"
        f"&redirect_uri={redirect_uri}"
        f"&response_type=code"
        f"&scope=openid%20email%20profile"
        f"&access_type=offline"
    )
    return RedirectResponse(f"{GOOGLE_AUTH_URL}?{params}")

@router.get("/callback")
async def callback(code: str, request: Request):
    """Handle Google OAuth callback, issue JWT, redirect to frontend."""
    redirect_uri = f"{BACKEND_URL}/api/auth/callback"
    async with httpx.AsyncClient() as client:
        # Exchange code for tokens
        token_resp = await client.post(GOOGLE_TOKEN_URL, data={
            "code":          code,
            "client_id":     GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri":  redirect_uri,
            "grant_type":    "authorization_code",
        })
        tokens = token_resp.json()
        access_token = tokens.get("access_token")
        if not access_token:
            raise HTTPException(400, "Failed to get access token from Google")

        # Get user info
        user_resp = await client.get(GOOGLE_USER_URL,
            headers={"Authorization": f"Bearer {access_token}"})
        user = user_resp.json()
        email = user.get("email", "")

    if not email:
        raise HTTPException(400, "Could not retrieve email from Google")

    is_admin = email.lower() == ADMIN_EMAIL.lower()

    if not is_admin:
        # Check if email is in the friend_invites table
        import sqlite3
        DB_PATH = os.environ.get("DB_PATH", "/data/sillage.db")
        con = sqlite3.connect(DB_PATH, check_same_thread=False)
        con.row_factory = sqlite3.Row
        row = con.execute(
            "SELECT id, is_active FROM friend_invites WHERE LOWER(email) = LOWER(?)", (email,)
        ).fetchone()
        con.close()

        if not row or not row["is_active"]:
            return RedirectResponse(f"{FRONTEND_URL}?auth_error=restricted")

    jwt = issue_token(email)

    # Log the login (non-admin users only)
    if not is_admin:
        try:
            import sqlite3 as _sq
            _DB = os.environ.get("DB_PATH", "/data/sillage.db")
            _con = _sq.connect(_DB, check_same_thread=False)
            _con.execute(
                "INSERT INTO login_history (email, logged_in_at) VALUES (?, datetime('now'))",
                (email,)
            )
            _con.commit()
            _con.close()
        except Exception:
            pass  # Never block login due to logging failure

    return RedirectResponse(f"{FRONTEND_URL}?token={jwt}")

@router.get("/history")
def login_history(request: Request):
    """Return login history for admin."""
    import sqlite3 as _sq
    DB_PATH = os.environ.get("DB_PATH", "/data/sillage.db")
    con = _sq.connect(DB_PATH, check_same_thread=False)
    con.row_factory = _sq.Row
    rows = con.execute(
        "SELECT email, logged_in_at FROM login_history ORDER BY logged_in_at DESC LIMIT 200"
    ).fetchall()
    con.close()
    return [{"email": r["email"], "logged_in_at": r["logged_in_at"]} for r in rows]

@router.get("/me")
def me(request: Request):
    user = get_current_user(request)
    if not user:
        return JSONResponse({"authenticated": False})
    return JSONResponse({
        "authenticated": True,
        "email": user.get("email"),
        "role":  user.get("role"),
    })

@router.post("/logout")
def logout():
    return JSONResponse({"ok": True})
