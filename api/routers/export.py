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
    rows = db.execute("SELECT * FROM fragrances ORDER BY brand ASC, name ASC").fetchall()

    def parse(val):
        try:
            return json.loads(val) if val else []
        except Exception:
            return []

    items_html = ""
    for row in rows:
        r      = dict(row)
        top    = ", ".join(parse(r.get("top_notes")))
        middle = ", ".join(parse(r.get("middle_notes")))
        base   = ", ".join(parse(r.get("base_notes")))
        accords= ", ".join(parse(r.get("main_accords")))
        flags  = " · ".join(filter(None, [
            "Tester"          if r.get("is_tester")          else "",
            "Discontinued"    if r.get("is_discontinued")    else "",
            "Limited Edition" if r.get("is_limited_edition") else "",
            "Exclusive"       if r.get("is_exclusive")       else "",
        ]))
        size = f"{r['size_ml']}ml" if r.get("size_ml") else ""
        meta = " · ".join(filter(None, [r.get("concentration"), size, str(r.get("year_released") or "")]))
        items_html += f"""
        <div class="item">
          <div class="ih">
            <b>{r['brand']}</b> — {r['name']}
            {f'<span class="tag">{flags}</span>' if flags else ''}
          </div>
          <div class="meta">{meta}</div>
          {f'<div class="n"><b>Top:</b> {top}</div>' if top else ''}
          {f'<div class="n"><b>Heart:</b> {middle}</div>' if middle else ''}
          {f'<div class="n"><b>Base:</b> {base}</div>' if base else ''}
          {f'<div class="n"><b>Accords:</b> {accords}</div>' if accords else ''}
        </div>"""

    return f"""<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Olfactori Catalog</title>
<style>
*{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:Georgia,serif;font-size:11pt;padding:1.5cm;max-width:21cm;margin:auto}}
h1{{font-size:22pt;margin-bottom:4px}}
.sub{{color:#666;font-size:10pt;margin-bottom:1.5cm}}
.item{{border-bottom:1px solid #ddd;padding:9px 0;page-break-inside:avoid}}
.ih{{font-size:11pt;margin-bottom:2px}}
.meta{{font-size:9pt;color:#888;margin-bottom:2px}}
.n{{font-size:9pt;color:#444;line-height:1.6}}
.tag{{font-size:8pt;color:#999;border:1px solid #ccc;padding:1px 4px;border-radius:3px;margin-left:6px}}
@media print{{body{{padding:1cm}}}}
</style></head><body>
<h1>Olfactori</h1>
<div class="sub">{len(rows)} bottles · Brand A–Z</div>
{items_html}
</body></html>"""
