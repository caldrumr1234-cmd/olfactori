"""
api/routers/export.py — Printable catalog
"""
import json
from fastapi import APIRouter, Depends
from fastapi.responses import HTMLResponse
from api.database import get_db

router = APIRouter()

@router.get("/catalog", response_class=HTMLResponse)
def print_catalog(db = Depends(get_db)):
    rows = db.execute("""
        SELECT * FROM fragrances ORDER BY brand ASC, name ASC
    """).fetchall()

    def parse(val, default=[]):
        try:
            return json.loads(val) if val else default
        except Exception:
            return default

    items_html = ""
    for row in rows:
        r = dict(row)
        top    = ", ".join(parse(r.get("top_notes")))
        middle = ", ".join(parse(r.get("middle_notes")))
        base   = ", ".join(parse(r.get("base_notes")))
        accords= ", ".join(parse(r.get("main_accords")))
        flags  = " ".join(filter(None, [
            "Tester"           if r.get("is_tester")          else "",
            "Discontinued"     if r.get("is_discontinued")    else "",
            "Limited Edition"  if r.get("is_limited_edition") else "",
            "Exclusive"        if r.get("is_exclusive")       else "",
        ]))
        size   = f"{r['size_ml']}ml" if r.get("size_ml") else ""
        conc   = r.get("concentration") or ""
        year   = str(r.get("year_released")) if r.get("year_released") else ""
        meta   = " · ".join(filter(None, [conc, size, year]))

        items_html += f"""
        <div class="item">
            <div class="item-header">
                <span class="brand">{r['brand']}</span>
                <span class="name">{r['name']}</span>
                {f'<span class="flags">{flags}</span>' if flags else ''}
            </div>
            <div class="meta">{meta}</div>
            {f'<div class="notes"><strong>Top:</strong> {top}</div>' if top else ''}
            {f'<div class="notes"><strong>Heart:</strong> {middle}</div>' if middle else ''}
            {f'<div class="notes"><strong>Base:</strong> {base}</div>' if base else ''}
            {f'<div class="accords"><strong>Accords:</strong> {accords}</div>' if accords else ''}
        </div>
        """

    total = len(rows)
    html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Olfactori — Fragrance Catalog</title>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: Georgia, serif; font-size: 11pt; color: #1a1a1a;
         padding: 1.5cm; max-width: 21cm; margin: auto; }}
  h1 {{ font-size: 24pt; margin-bottom: 4px; }}
  .subtitle {{ color: #666; font-size: 10pt; margin-bottom: 2cm; }}
  .item {{ border-bottom: 1px solid #ddd; padding: 10px 0; page-break-inside: avoid; }}
  .item-header {{ display: flex; align-items: baseline; gap: 8px; margin-bottom: 3px; }}
  .brand {{ font-weight: bold; font-size: 11pt; }}
  .name {{ font-size: 11pt; color: #333; }}
  .flags {{ font-size: 8pt; color: #888; border: 1px solid #ccc;
            padding: 1px 5px; border-radius: 3px; }}
  .meta {{ font-size: 9pt; color: #888; margin-bottom: 3px; }}
  .notes, .accords {{ font-size: 9pt; color: #444; line-height: 1.5; }}
  @media print {{
    body {{ padding: 1cm; }}
    .item {{ break-inside: avoid; }}
  }}
</style>
</head>
<body>
<h1>Olfactori</h1>
<div class="subtitle">Fragrance Collection · {total} bottles · Sorted by Brand</div>
{items_html}
</body>
</html>"""
    return html


"""
api/routers/settings.py
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from api.database import get_db

settings_router = APIRouter()

class SettingUpdate(BaseModel):
    value: str

@settings_router.get("/")
def get_settings(db = Depends(get_db)):
    rows = db.execute("SELECT key, value FROM settings").fetchall()
    return {r["key"]: r["value"] for r in rows}

@settings_router.patch("/{key}")
def update_setting(key: str, data: SettingUpdate, db = Depends(get_db)):
    db.execute(
        "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))",
        (key, data.value)
    )
    db.commit()
    return {"key": key, "value": data.value}
