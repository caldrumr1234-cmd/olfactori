"""
test_report.py
==============
Runs enrichment on your test fragrances and saves a clean HTML report
you can open in any browser to review the results.

Usage:
    python test_report.py

Opens enrichment_report.html when done.
"""

import json
import sqlite3
import webbrowser
import sys
import os
from pathlib import Path
from datetime import datetime

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

DB_PATH = Path("data/sillage.db")
REPORT_PATH = Path("enrichment_report.html")

TEST_FRAGRANCES = [
    ("4711",            "Acqua Colonia Intense Wakening Woods of Scandinavia"),
    ("4711",            "Remix Green Oasis"),
    ("Acqua di Parma",  "Arancia di Capri"),
    ("Acqua di Parma",  "Cipresso di Toscana"),
    ("Acqua di Parma",  "Bergamotto di Calabria"),
]


def get_results() -> list[dict]:
    """Pull enrichment results from DB for our test fragrances."""
    if not DB_PATH.exists():
        print("Database not found. Running ingestion first...")
        from sheets_ingest import main as ingest
        sys.argv = ["sheets_ingest.py", "--demo"]
        ingest()

    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    results = []

    for brand, name in TEST_FRAGRANCES:
        row = con.execute(
            "SELECT * FROM fragrances WHERE brand = ? AND name = ?",
            (brand, name)
        ).fetchone()

        if row:
            d = dict(row)
            # Parse JSON fields
            for field in ["top_notes", "middle_notes", "base_notes", "main_accords"]:
                try:
                    d[field] = json.loads(d.get(field) or "[]")
                except Exception:
                    d[field] = []
            results.append(d)
        else:
            results.append({
                "brand": brand,
                "name": name,
                "enrichment_status": "not_found",
                "top_notes": [], "middle_notes": [], "base_notes": [], "main_accords": []
            })

    con.close()
    return results


def status_icon(value) -> str:
    if value is None or value == "" or value == [] or value == "not_found":
        return '<span class="miss">✗</span>'
    return '<span class="hit">✓</span>'


def notes_html(notes: list) -> str:
    if not notes:
        return '<span class="empty">—</span>'
    return " ".join(f'<span class="pill">{n}</span>' for n in notes)


def build_report(results: list[dict]) -> str:
    passed = sum(1 for r in results if r.get("enrichment_status") == "success")
    failed = len(results) - passed
    now = datetime.now().strftime("%B %d, %Y at %I:%M %p")

    cards = ""
    for r in results:
        status = r.get("enrichment_status", "unknown")
        status_class = "success" if status == "success" else "failed"
        status_label = "✓ Enriched" if status == "success" else "✗ Failed / Pending"

        url = r.get("fragrantica_url", "")
        url_html = f'<a href="{url}" target="_blank">{url}</a>' if url else '<span class="empty">—</span>'

        rating = r.get("fragrantica_rating")
        rating_html = f'<strong>{rating}</strong> / 5.0' if rating else '<span class="empty">—</span>'

        cards += f"""
        <div class="card {status_class}">
            <div class="card-header">
                <div>
                    <div class="brand">{r.get('brand', '')}</div>
                    <div class="fragname">{r.get('name', '')}</div>
                </div>
                <span class="badge {status_class}">{status_label}</span>
            </div>

            <div class="grid2">
                <div class="field">
                    {status_icon(r.get('perfumer'))} <label>Perfumer</label>
                    <span>{r.get('perfumer') or '—'}</span>
                </div>
                <div class="field">
                    {status_icon(r.get('year_released'))} <label>Year</label>
                    <span>{r.get('year_released') or '—'}</span>
                </div>
                <div class="field">
                    {status_icon(r.get('concentration'))} <label>Concentration</label>
                    <span>{r.get('concentration') or '—'}</span>
                </div>
                <div class="field">
                    {status_icon(r.get('gender_class'))} <label>Gender</label>
                    <span>{r.get('gender_class') or '—'}</span>
                </div>
                <div class="field">
                    {status_icon(rating)} <label>Rating</label>
                    <span>{rating_html}</span>
                </div>
                <div class="field">
                    {status_icon(r.get('fragrantica_votes'))} <label>Votes</label>
                    <span>{r.get('fragrantica_votes') or '—'}</span>
                </div>
            </div>

            <div class="notes-section">
                <div class="notes-row">
                    {status_icon(r.get('top_notes'))}
                    <label>Top Notes</label>
                    <div>{notes_html(r.get('top_notes', []))}</div>
                </div>
                <div class="notes-row">
                    {status_icon(r.get('middle_notes'))}
                    <label>Heart Notes</label>
                    <div>{notes_html(r.get('middle_notes', []))}</div>
                </div>
                <div class="notes-row">
                    {status_icon(r.get('base_notes'))}
                    <label>Base Notes</label>
                    <div>{notes_html(r.get('base_notes', []))}</div>
                </div>
                <div class="notes-row">
                    {status_icon(r.get('main_accords'))}
                    <label>Accords</label>
                    <div>{notes_html(r.get('main_accords', []))}</div>
                </div>
            </div>

            <div class="url-row">
                🔗 <label>Fragrantica URL</label> {url_html}
            </div>

            <!-- Sheet flags -->
            <div class="flags">
                {'<span class="flag disc">Discontinued</span>' if r.get('is_discontinued') else ''}
                {'<span class="flag tester">Tester</span>' if r.get('is_tester') else ''}
                {'<span class="flag le">Limited Edition</span>' if r.get('is_limited_edition') else ''}
                {'<span class="flag excl">Exclusive</span>' if r.get('is_exclusive') else ''}
                {f'<span class="flag cond">{r.get("condition_notes")}</span>' if r.get('condition_notes') else ''}
            </div>
        </div>
        """

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Sillage — Enrichment Test Report</title>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
         background: #0f0f13; color: #e0d8d0; min-height: 100vh; padding: 40px 20px; }}
  h1 {{ font-size: 28px; font-weight: 700; color: #c9a84c; margin-bottom: 4px; }}
  .subtitle {{ color: #5a5a6a; font-size: 14px; margin-bottom: 30px; }}
  .summary {{ display: flex; gap: 16px; margin-bottom: 32px; }}
  .stat {{ background: #1a1a22; border: 1px solid #2e2e38; border-radius: 10px;
           padding: 16px 24px; text-align: center; }}
  .stat .num {{ font-size: 32px; font-weight: 700; }}
  .stat .lbl {{ font-size: 12px; color: #5a5a6a; text-transform: uppercase;
                letter-spacing: 0.08em; margin-top: 4px; }}
  .stat.ok .num {{ color: #4ade80; }}
  .stat.bad .num {{ color: #f87171; }}
  .stat.tot .num {{ color: #c9a84c; }}

  .card {{ background: #1a1a22; border: 1px solid #2e2e38; border-radius: 12px;
           padding: 24px; margin-bottom: 20px; max-width: 800px; }}
  .card.failed {{ border-color: #f8717144; }}
  .card.success {{ border-color: #4ade8033; }}
  .card-header {{ display: flex; justify-content: space-between;
                  align-items: flex-start; margin-bottom: 20px; }}
  .brand {{ font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em;
            color: #8a7060; margin-bottom: 4px; }}
  .fragname {{ font-size: 20px; font-weight: 600; color: #ede5da; }}
  .badge {{ padding: 4px 12px; border-radius: 99px; font-size: 12px; font-weight: 600; }}
  .badge.success {{ background: #4ade8022; color: #4ade80; border: 1px solid #4ade8044; }}
  .badge.failed  {{ background: #f8717122; color: #f87171; border: 1px solid #f8717144; }}

  .grid2 {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }}
  .field {{ display: flex; align-items: center; gap: 8px; font-size: 14px; }}
  .field label {{ color: #5a5a6a; min-width: 100px; }}
  .field span {{ color: #c8c0b8; }}

  .notes-section {{ background: #13131a; border-radius: 8px; padding: 16px;
                    margin-bottom: 16px; }}
  .notes-row {{ display: flex; align-items: flex-start; gap: 10px;
                margin-bottom: 10px; font-size: 14px; }}
  .notes-row:last-child {{ margin-bottom: 0; }}
  .notes-row label {{ color: #5a5a6a; min-width: 90px; padding-top: 2px; }}
  .notes-row div {{ flex: 1; }}

  .pill {{ display: inline-block; background: rgba(139,110,78,0.2);
           border: 1px solid rgba(139,110,78,0.35); color: #c8a878;
           padding: 2px 8px; border-radius: 4px; font-size: 12px;
           margin: 2px 2px 2px 0; }}

  .url-row {{ font-size: 13px; color: #5a5a6a; margin-bottom: 12px; }}
  .url-row a {{ color: #c9a84c; text-decoration: none; word-break: break-all; }}
  .url-row a:hover {{ text-decoration: underline; }}
  .url-row label {{ margin: 0 8px; }}

  .flags {{ display: flex; gap: 8px; flex-wrap: wrap; }}
  .flag {{ padding: 3px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; }}
  .flag.disc  {{ background: #f8717122; color: #f87171; }}
  .flag.tester{{ background: #60a5fa22; color: #60a5fa; }}
  .flag.le    {{ background: #a78bfa22; color: #a78bfa; }}
  .flag.excl  {{ background: #fbbf2422; color: #fbbf24; }}
  .flag.cond  {{ background: #34d39922; color: #34d399; }}

  .hit  {{ color: #4ade80; }}
  .miss {{ color: #f87171; }}
  .empty {{ color: #3d3d50; }}

  .footer {{ margin-top: 32px; font-size: 12px; color: #3d3d50; max-width: 800px; }}
</style>
</head>
<body>
  <h1>🌿 Sillage — Enrichment Test Report</h1>
  <div class="subtitle">Generated {now} · {len(results)} fragrances tested</div>

  <div class="summary">
    <div class="stat tot"><div class="num">{len(results)}</div><div class="lbl">Tested</div></div>
    <div class="stat ok"><div class="num">{passed}</div><div class="lbl">Enriched</div></div>
    <div class="stat bad"><div class="num">{failed}</div><div class="lbl">Failed / Pending</div></div>
  </div>

  {cards}

  <div class="footer">
    ✓ = data found &nbsp;|&nbsp; ✗ = not found &nbsp;|&nbsp;
    Flags (Discontinued, Tester, etc.) come from your Google Sheet Notes column.<br>
    If fields show ✗, the Fragrantica page may need a parser adjustment — share this report and it'll be fixed.
  </div>
</body>
</html>"""


def main():
    print("Pulling results from database...")
    results = get_results()

    # Run enrichment if still pending
    pending = [r for r in results if r.get("enrichment_status") in ("pending", "not_found")]
    if pending:
        print(f"{len(pending)} fragrances not yet enriched — running enrichment now...")
        from enrichment import enrich_single
        for r in pending:
            enrich_single(r["brand"], r["name"], force=False)
        # Re-fetch after enrichment
        results = get_results()

    print("Building report...")
    html = build_report(results)
    REPORT_PATH.write_text(html, encoding="utf-8")

    abs_path = REPORT_PATH.resolve()
    print(f"\nReport saved: {abs_path}")
    print("Opening in browser...")
    # Windows-safe: os.startfile opens with default browser association
    try:
        os.startfile(str(abs_path))
    except Exception:
        import urllib.request
        webbrowser.open(abs_path.as_uri())


if __name__ == "__main__":
    main()
