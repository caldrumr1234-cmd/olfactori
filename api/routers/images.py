"""
api/routers/images.py — Cloudflare R2 image mirroring
"""
import os, hashlib, mimetypes
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
import httpx, boto3
from botocore.config import Config
from api.database import get_db
from api.routers.auth import require_admin

router = APIRouter()

# ── R2 CONFIG ─────────────────────────────────────────────────
R2_ENDPOINT       = os.environ.get("R2_ENDPOINT", "")
R2_ACCESS_KEY_ID  = os.environ.get("R2_ACCESS_KEY_ID", "")
R2_SECRET_ACCESS_KEY = os.environ.get("R2_SECRET_ACCESS_KEY", "")
R2_BUCKET         = os.environ.get("R2_BUCKET", "olfactori-images")
R2_PUBLIC_URL     = os.environ.get("R2_PUBLIC_URL", "").rstrip("/")

def get_s3():
    return boto3.client(
        "s3",
        endpoint_url=R2_ENDPOINT,
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )

def url_to_key(url: str, frag_id: int) -> str:
    """Derive a stable object key from frag ID + URL hash."""
    ext = ".jpg"
    for candidate in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
        if candidate in url.lower():
            ext = candidate
            break
    url_hash = hashlib.md5(url.encode()).hexdigest()[:8]
    return f"fragrances/{frag_id}_{url_hash}{ext}"

async def mirror_url_to_r2(url: str, frag_id: int) -> str | None:
    """Download image from URL and upload to R2. Returns public URL or None."""
    if not all([R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_URL]):
        return None
    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            if resp.status_code != 200:
                return None
            data = resp.content
            ct = resp.headers.get("content-type", "image/jpeg").split(";")[0]
            if not ct.startswith("image/"):
                ct = "image/jpeg"
        key = url_to_key(url, frag_id)
        s3 = get_s3()
        s3.put_object(
            Bucket=R2_BUCKET,
            Key=key,
            Body=data,
            ContentType=ct,
            CacheControl="public, max-age=31536000",
        )
        return f"{R2_PUBLIC_URL}/{key}"
    except Exception as e:
        print(f"[R2] mirror failed for frag {frag_id}: {e}")
        return None

# ── MIRROR SINGLE FRAGRANCE ───────────────────────────────────
@router.post("/mirror/{frag_id}")
async def mirror_fragrance(frag_id: int, request: Request):
    require_admin(request)
    con = next(get_db())
    row = con.execute(
        "SELECT id, name, custom_image_url, fragella_image_url, r2_image_url FROM fragrances WHERE id = ?",
        (frag_id,)
    ).fetchone()
    if not row:
        raise HTTPException(404, "Fragrance not found")

    # Already mirrored
    if row["r2_image_url"]:
        return {"ok": True, "r2_image_url": row["r2_image_url"], "skipped": True}

    source_url = row["custom_image_url"] or row["fragella_image_url"]
    if not source_url:
        return {"ok": False, "reason": "no_source_url"}

    r2_url = await mirror_url_to_r2(source_url, frag_id)
    if not r2_url:
        return {"ok": False, "reason": "upload_failed"}

    con.execute("UPDATE fragrances SET r2_image_url = ? WHERE id = ?", (r2_url, frag_id))
    con.commit()
    return {"ok": True, "r2_image_url": r2_url}

# ── BULK MIRROR ALL ───────────────────────────────────────────
@router.post("/mirror-all")
async def mirror_all(request: Request):
    require_admin(request)
    con = next(get_db())
    rows = con.execute(
        """SELECT id, custom_image_url, fragella_image_url, r2_image_url
           FROM fragrances
           WHERE r2_image_url IS NULL
             AND (custom_image_url IS NOT NULL OR fragella_image_url IS NOT NULL)"""
    ).fetchall()

    results = {"mirrored": 0, "failed": 0, "skipped": 0}
    for row in rows:
        source_url = row["custom_image_url"] or row["fragella_image_url"]
        r2_url = await mirror_url_to_r2(source_url, row["id"])
        if r2_url:
            con.execute("UPDATE fragrances SET r2_image_url = ? WHERE id = ?", (r2_url, row["id"]))
            con.commit()
            results["mirrored"] += 1
        else:
            results["failed"] += 1

    return results

# ── MIRROR STATUS ─────────────────────────────────────────────
@router.get("/status")
async def mirror_status(request: Request):
    require_admin(request)
    con = next(get_db())
    total   = con.execute("SELECT COUNT(*) FROM fragrances").fetchone()[0]
    has_img = con.execute(
        "SELECT COUNT(*) FROM fragrances WHERE custom_image_url IS NOT NULL OR fragella_image_url IS NOT NULL"
    ).fetchone()[0]
    mirrored = con.execute(
        "SELECT COUNT(*) FROM fragrances WHERE r2_image_url IS NOT NULL"
    ).fetchone()[0]
    pending = con.execute(
        """SELECT COUNT(*) FROM fragrances
           WHERE r2_image_url IS NULL
             AND (custom_image_url IS NOT NULL OR fragella_image_url IS NOT NULL)"""
    ).fetchone()[0]
    return {
        "total": total,
        "has_source_image": has_img,
        "mirrored_to_r2": mirrored,
        "pending": pending,
    }

# ── MIRROR ON CUSTOM URL SAVE (called from fragrances PATCH) ──
async def mirror_custom_url(frag_id: int, url: str, con) -> str | None:
    """Mirror a freshly-saved custom URL to R2 and return the R2 URL."""
    r2_url = await mirror_url_to_r2(url, frag_id)
    if r2_url:
        con.execute("UPDATE fragrances SET r2_image_url = ? WHERE id = ?", (r2_url, frag_id))
        con.commit()
    return r2_url
