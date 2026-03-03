# 🌿 Sillage — Fragrance Collection Manager

A full-stack personal fragrance database with enrichment from Fragrantica,
smart filtering, mood-based recommendations, wear tracking, and a polished web UI.

---

## Project Structure

```
sillage/
├── data/
│   └── sillage.db          ← SQLite database (auto-created)
├── cache/                  ← Fragrantica scrape cache
├── schema.sql              ← Database schema
├── sheets_ingest.py        ← Google Sheets → DB sync
├── enrichment.py           ← Fragrantica scraper + parser
├── run_enrichment.py       ← CLI enrichment runner
├── api/
│   └── main.py             ← FastAPI backend (Phase 3)
├── frontend/               ← React app (Phase 4+)
├── credentials.json        ← YOUR Google service account (never commit this)
├── .env                    ← Local config
├── requirements.txt
└── README.md
```

---

## Phase 1 Setup

### 1. Install Python dependencies

```cmd
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

---

### 2. Set up Google Sheets API credentials

This is a one-time 5-minute process. You'll create a **service account** —
a bot identity that has read-only access to your sheet.

#### Step-by-step:

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click **Select a project** → **New Project** → name it `sillage` → Create
3. In the sidebar: **APIs & Services → Library**
4. Search for **Google Sheets API** → Enable it
5. Search for **Google Drive API** → Enable it
6. Go to **APIs & Services → Credentials**
7. Click **Create Credentials → Service Account**
   - Name: `sillage-reader`
   - Role: leave blank (click Continue, then Done)
8. Click the service account you just created
9. Go to the **Keys** tab → **Add Key → Create new key → JSON**
10. Download the JSON file → rename it `credentials.json`
11. Move it into your `sillage/` project folder

#### Share your Google Sheet with the service account:

1. Open `credentials.json` — find the `"client_email"` field
   It looks like: `sillage-reader@sillage-xxxxx.iam.gserviceaccount.com`
2. Open your Google Sheet
3. Click **Share** (top right)
4. Paste that email address → set to **Viewer** → Share

That's it. The script now has read-only access to your sheet.

---

### 3. Configure your sheet name

Open `sheets_ingest.py` and confirm this matches your exact Google Sheet name:

```python
SHEET_NAME = "My Fragrances"   # ← change if different
```

---

### 4. Run the ingestion

```cmd
:: Preview what will be imported (no DB writes)
python sheets_ingest.py --dry-run

:: Full import
python sheets_ingest.py

:: If you need to reset and reload everything
python sheets_ingest.py --reset
```

**Expected output:**
```
INFO  Opening sheet: 'My Fragrances'
INFO  Fetched 247 rows from Google Sheets
INFO  ──────────────────────────────────────────────────
INFO    Inserted : 247
INFO    Updated  : 0
INFO    Skipped  : 0
INFO    Errors   : 0
```

---

## Phase 2 — Enrichment

### Test the enrichment pipeline first

Before running on all 200+ fragrances, validate it works on your sample set:

```bash
python run_enrichment.py --test
```

This tests on the 5 fragrances from your original sample data and shows
exactly what data was found for each one. Review the output carefully.

### Enrich your full collection

```bash
# Enrich all pending (new) fragrances — runs in batches with rate limiting
python run_enrichment.py --all

# Check progress at any time
python run_enrichment.py --status

# Retry anything that failed (Fragrantica occasionally 429s)
python run_enrichment.py --retry-failed

# Force re-enrich a specific fragrance
python run_enrichment.py --brand "Acqua di Parma" --name "Cipresso di Toscana" --force
```

### About rate limiting

The enrichment engine waits **2.5 seconds between requests** to avoid
getting blocked by Fragrantica. For 250 fragrances this takes ~15-20 minutes.
You can safely run it overnight.

---

## Notes Column Parsing

Your existing Notes column is automatically parsed into structured fields:

| Your Notes text | → Stored as |
|---|---|
| "Discontinued" | `is_discontinued = true` |
| "Tester - No Cap" | `is_tester = true`, `condition_notes = "no cap"` |
| "Limited Edition" | `is_limited_edition = true` |
| "Boutique Exclusive" | `is_exclusive = true`, `exclusive_type = "boutique"` |
| "Splash" | `personal_notes = "splash"` |

Anything not recognized goes into `personal_notes` as-is.

---

## Brand Auto-Fixes

Google Sheets sometimes mangles brand names that look like numbers.
The following are automatically corrected during ingestion:

| In your Sheet | Stored as |
|---|---|
| `47114711` | `4711` |
| `4711.0` | `4711` |

Add more to the `BRAND_FIXES` dict in `sheets_ingest.py` if needed.

---

## Environment Config

Create a `.env` file in your project folder with Notepad or any text editor:

```
DB_PATH=data\sillage.db
SHEET_NAME=My Fragrances
CACHE_EXPIRE_DAYS=30
REQUEST_DELAY=2.5
```

---

## Railway Deployment (Phase 12)

When ready to host:

1. Install [Railway CLI](https://docs.railway.app/develop/cli): `npm install -g @railway/cli`
2. Open CMD and run:
```cmd
railway login
railway init
railway up
```
3. Add your `credentials.json` contents as an environment secret in the Railway dashboard (never commit the file itself)

Full deployment guide will be included with Phase 3 (FastAPI backend).

---

## Coming Next

| Phase | Status |
|---|---|
| ✅ Phase 1 — Data ingestion (Sheets → SQLite) | Done |
| ✅ Phase 2 — Fragrantica enrichment engine | Done |
| 🔜 Phase 3 — FastAPI backend | Next |
| 🔜 Phase 4 — Core UI (Grid / Table / Stats) | Upcoming |
| 🔜 Phase 5 — Mood wheel | Upcoming |
| 🔜 Phase 6 — Notes explorer (D3 graph) | Upcoming |
| 🔜 Phase 7 — Blind spot + Dupe radar | Upcoming |
| 🔜 Phase 8 — Wardrobe mode (weather-aware) | Upcoming |
| 🔜 Phase 9 — Wear log | Upcoming |
| 🔜 Phase 10 — Wishlist + price tracker | Upcoming |
| 🔜 Phase 11 — Layering / Pairing | Upcoming |
| 🔜 Phase 12 — Public read-only sharing | Upcoming |
