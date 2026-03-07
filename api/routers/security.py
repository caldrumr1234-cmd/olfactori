"""
api/routers/security.py — Public/private access settings per tab/feature
"""
from fastapi import APIRouter, Depends, Request
from api.database import get_db
from api.routers.auth import require_admin

router = APIRouter()

# Default settings — all private until admin explicitly opens them
DEFAULTS = [
    {"key": "tab_collection",   "label": "Collection Tab",          "group": "Tabs",     "public": 0},
    {"key": "tab_insights",     "label": "Insights Tab",            "group": "Tabs",     "public": 0},
    {"key": "tab_explore",      "label": "Explore Tab",             "group": "Tabs",     "public": 0},
    {"key": "tab_wishlist",     "label": "Wishlist Tab",            "group": "Tabs",     "public": 0},
    {"key": "tab_wardrobe",     "label": "Wardrobe Tab",            "group": "Tabs",     "public": 0},
    {"key": "tab_shelves",      "label": "Shelves Tab",             "group": "Tabs",     "public": 0},
    {"key": "tab_notes",        "label": "Notes Tab",               "group": "Tabs",     "public": 0},
    {"key": "tab_usedtohave",   "label": "Used to Have Tab",        "group": "Tabs",     "public": 0},
    {"key": "tab_decants",      "label": "Decants & Samples Tab",   "group": "Tabs",     "public": 0},
    {"key": "feat_sample_req",  "label": "Sample Request Button",   "group": "Features", "public": 0},
    {"key": "feat_spin_bottle", "label": "Spin the Bottle",         "group": "Features", "public": 0},
    {"key": "feat_note_cloud",  "label": "Note Cloud",              "group": "Features", "public": 0},
    {"key": "feat_top_houses",  "label": "Top Houses",              "group": "Features", "public": 0},
    {"key": "feat_timeline",    "label": "Scent Timeline",          "group": "Features", "public": 0},
    {"key": "feat_wishlist_view","label": "View Wishlist Items",     "group": "Features", "public": 0},
    {"key": "feat_decant_view", "label": "View Decants/Samples",    "group": "Features", "public": 0},
]

def ensure_defaults(db):
    """Insert any missing default rows."""
    for d in DEFAULTS:
        exists = db.execute(
            "SELECT 1 FROM security_settings WHERE key=?", (d["key"],)
        ).fetchone()
        if not exists:
            db.execute(
                "INSERT INTO security_settings (key, label, grp, public) VALUES (?,?,?,?)",
                (d["key"], d["label"], d["group"], d["public"])
            )
    db.commit()

@router.get("")
def get_settings(db = Depends(get_db)):
    """Public endpoint — returns current settings so frontend can enforce them."""
    ensure_defaults(db)
    rows = db.execute("SELECT key, label, grp, public FROM security_settings ORDER BY grp, label").fetchall()
    return {"settings": [{k: r[k] for k in r.keys()} for r in rows]}

@router.patch("/{key}")
def update_setting(key: str, body: dict, request: Request, db = Depends(get_db)):
    require_admin(request)
    ensure_defaults(db)
    public = 1 if body.get("public") else 0
    db.execute("UPDATE security_settings SET public=? WHERE key=?", (public, key))
    db.commit()
    return {"key": key, "public": public}

@router.post("/reset")
def reset_settings(request: Request, db = Depends(get_db)):
    require_admin(request)
    db.execute("DELETE FROM security_settings")
    db.commit()
    ensure_defaults(db)
    return {"ok": True}
