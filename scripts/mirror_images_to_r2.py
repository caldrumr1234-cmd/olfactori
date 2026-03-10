#!/usr/bin/env python3
"""
scripts/mirror_images_to_r2.py
Run this locally or on Railway to bulk-mirror all fragrance images to Cloudflare R2.

Usage:
    python scripts/mirror_images_to_r2.py

Set env vars first:
    R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL, DB_PATH
"""
import os, sys, hashlib, time, sqlite3
import httpx, boto3
from botocore.config import Config

R2_ENDPOINT          = os.environ.get("R2_ENDPOINT", "https://fda2c666ebb936a21c7699f3d4317857.r2.cloudflarestorage.com")
R2_ACCESS_KEY_ID     = os.environ.get("R2_ACCESS_KEY_ID", "")
R2_SECRET_ACCESS_KEY = os.environ.get("R2_SECRET_ACCESS_KEY", "")
R2_BUCKET            = os.environ.get("R2_BUCKET", "olfactori-images")
R2_PUBLIC_URL        = os.environ.get("R2_PUBLIC_URL", "https://pub-1b90d2593974475cbb21e09ea50839cb.r2.dev").rstrip("/")
DB_PATH              = os.environ.get("DB_PATH", "data/sillage.db")

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
    ext = ".jpg"
    for candidate in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
        if candidate in url.lower():
            ext = candidate
            break
    url_hash = hashlib.md5(url.encode()).hexdigest()[:8]
    return f"fragrances/{frag_id}_{url_hash}{ext}"

def mirror_one(s3, url: str, frag_id: int) -> str | None:
    try:
        with httpx.Client(timeout=20, follow_redirects=True) as client:
            resp = client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            if resp.status_code != 200:
                return None
            data = resp.content
            ct = resp.headers.get("content-type", "image/jpeg").split(";")[0]
            if not ct.startswith("image/"):
                ct = "image/jpeg"
        key = url_to_key(url, frag_id)
        s3.put_object(
            Bucket=R2_BUCKET,
            Key=key,
            Body=data,
            ContentType=ct,
            CacheControl="public, max-age=31536000",
        )
        return f"{R2_PUBLIC_URL}/{key}"
    except Exception as e:
        print(f"  ✗ frag {frag_id}: {e}")
        return None

def main():
    if not R2_ACCESS_KEY_ID or not R2_SECRET_ACCESS_KEY:
        print("ERROR: R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY must be set")
        sys.exit(1)

    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row

    # Add column if missing
    try:
        con.execute("ALTER TABLE fragrances ADD COLUMN r2_image_url TEXT")
        con.commit()
        print("Added r2_image_url column")
    except Exception:
        pass

    rows = con.execute(
        """SELECT id, brand, name, custom_image_url, fragella_image_url
           FROM fragrances
           WHERE r2_image_url IS NULL
             AND (custom_image_url IS NOT NULL OR fragella_image_url IS NOT NULL)
           ORDER BY id"""
    ).fetchall()

    total = len(rows)
    print(f"Found {total} fragrances to mirror\n")

    if total == 0:
        print("Nothing to do — all images already mirrored.")
        return

    s3 = get_s3()
    mirrored = 0
    failed   = 0

    for i, row in enumerate(rows, 1):
        source = row["custom_image_url"] or row["fragella_image_url"]
        label  = f"{row['brand']} — {row['name']}"
        print(f"[{i}/{total}] {label[:60]}")
        r2_url = mirror_one(s3, source, row["id"])
        if r2_url:
            con.execute("UPDATE fragrances SET r2_image_url = ? WHERE id = ?", (r2_url, row["id"]))
            con.commit()
            print(f"  ✓ {r2_url}")
            mirrored += 1
        else:
            print(f"  ✗ failed")
            failed += 1
        # Be polite to source servers
        time.sleep(0.15)

    print(f"\n{'─'*60}")
    print(f"Done. Mirrored: {mirrored}  Failed: {failed}  Total: {total}")
    con.close()

if __name__ == "__main__":
    main()
