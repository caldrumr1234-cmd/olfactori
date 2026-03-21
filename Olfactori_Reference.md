# Olfactori — Architecture & Operations Reference

*How the pieces fit together. Last updated March 2026.*

---

## 1. What Is Olfactori?

Olfactori is a personal fragrance collection management web app built to track, browse, and share a collection of bottles. It has a public-facing shareable collection page, a wishlist, a wear log, wardrobe suggestions, and an admin panel for managing the collection. It is a private app — access is restricted to you (the admin) and people you explicitly invite.

---

## 2. How It Is Built

Olfactori is split into two separate applications that talk to each other.

### Frontend (the website)

Built with **React** and **Vite**. This is what users see and interact with in their browser. It is a single-page app — all tabs, drawers, and modals are handled in React without full page reloads.

**Key files:**

| File | Purpose |
|---|---|
| `App.jsx` | Main app shell, navigation, collection grid, filter panel, card drawer |
| `InsightsTab.jsx` | Collection statistics and charts |
| `ExploreTab.jsx` | Note cloud, top houses, Spin the Bottle, scent timeline |
| `WardrobeTab.jsx` | Weather-based suggestions, wear log |
| `WishlistTab.jsx` | Wishlist with drawer and images |
| `ShelvesTab.jsx` | Custom shelves |
| `NotesTab.jsx` | Browse by fragrance notes |
| `UsedToHaveTab.jsx` | Fragrances you no longer own |
| `DecantsTab.jsx` | Decants and samples tracker |
| `AdminTab.jsx` | Admin panel (friends, batch enrich, DB backup, share settings, trade requests, access control) |
| `EnrichPanel.jsx` | Fragrance enrichment UI (Refresh Image, Re-scrape, Fill Missing) |
| `SharePage.jsx` | The public collection page at `/share/adam` |

### Backend (the API)

Built with **FastAPI** (Python). Handles all data — reading and writing fragrances, wear log, wishlist, authentication, image mirroring, and enrichment. Talks to a SQLite database.

**Key files:**

| File | Purpose |
|---|---|
| `api/main.py` | Registers all routers, sets up CORS |
| `api/database.py` | SQLite connection helper |
| `api/routers/fragrances.py` | CRUD for the main collection + enrichment endpoints |
| `api/routers/images.py` | Cloudflare R2 image mirroring |
| `api/routers/wear_log.py` | Logging and retrieving wears |
| `api/routers/wishlist.py` | Wishlist CRUD |
| `api/routers/insights.py` | Stats for the Insights tab |
| `api/routers/suggest.py` | Fragrance suggestion engine |
| `api/routers/shelves.py` | Custom shelves |
| `api/routers/used_to_have.py` | Used to Have CRUD |
| `api/routers/decants.py` | Decants & samples CRUD |
| `api/routers/share.py` | Public share page data |
| `api/routers/trade_requests.py` | Trade request submissions and admin management |
| `api/routers/auth.py` | Google OAuth login and JWT issuance |
| `api/routers/security.py` | Per-tab/feature public visibility toggles |

### Database

A single SQLite file called `sillage.db`. Lives on a Railway Volume at `/data/sillage.db`.

| Table | Contents |
|---|---|
| `fragrances` | Main collection — brand, name, notes, images, flags, availability |
| `wishlist` | Wishlist items with priority, notes, image URLs |
| `used_to_have` | Previously owned fragrances with reason gone |
| `decants` | Decants and samples with size, quantity, notes |
| `wear_log` | Date-stamped wear records linked to fragrance IDs |
| `friends` | Invited users — email, invite link, revoked status |
| `shelves` | Custom shelf definitions |
| `shelf_items` | Which fragrances are on which shelves |
| `security_settings` | Per-tab and per-feature public/private toggles |
| `share_profiles` | Public share page settings (display name, bio, visibility) |
| `trade_requests` | Incoming trade requests from the public share page |

---

## 3. Where It Is Hosted

### Railway (backend)

Railway runs the FastAPI backend. Always on. When the frontend needs data, it makes API calls to Railway.

| Detail | Value |
|---|---|
| Project name | `sublime-delight` |
| Service name | `olfactori` |
| URL | `https://olfactori-production.up.railway.app` |
| Start command | `bash startup.sh` (runs migrations, then starts uvicorn) |
| Volume ID | `vol_qjelnaom0f3e85xm` |
| Cost | ~$5–10/month based on usage |

**Important:** Railway rebuilds and restarts on every `git push`. The `startup.sh` script runs schema migrations automatically on each boot, so adding new database columns is safe. The Volume (database) persists across deploys — it is never wiped unless you manually clear it from the Railway UI.

### Vercel (frontend)

Vercel hosts the React frontend. Automatically rebuilds and redeploys when you push to GitHub. Free for personal use.

| Detail | Value |
|---|---|
| URL | `https://www.olfactori.vip` |
| Build command | `npm run build` (Vite) |
| Output directory | `dist` |
| Config file | `frontend/vercel.json` (rewrites all paths to index.html for SPA routing) |
| Cost | Free |

The domain `olfactori.vip` is registered separately and pointed to Vercel via DNS. Both `www.olfactori.vip` and `olfactori.vip` resolve to the site.

### Cloudflare R2 (image storage)

All fragrance images are mirrored to and served from a Cloudflare R2 bucket. Images are stored publicly with a 1-year cache header. This means images always load fast and reliably, independent of third-party image sources going down.

| Detail | Value |
|---|---|
| Bucket | `olfactori-images` |
| Key pattern | `fragrances/{frag_id}_{url_hash}.{ext}` |
| Public URL | Set in `R2_PUBLIC_URL` Railway env var |

**Image display priority:** `r2_image_url` → `custom_image_url` → `fragella_image_url` → placeholder

**Auto-mirroring:** Images are automatically mirrored to R2 whenever you save a new image (via Refresh Image, Re-scrape, or entering a custom URL in the Edit tab). You no longer need to press "Copy to R2" manually — it happens in the background as part of saving.

---

## 4. Deploying Changes

Both Railway and Vercel deploy automatically when you push to GitHub.

```
cd C:\Users\Adam\Desktop\Olfactori
git add <files>
git commit -m "Description of change"
git push
```

After pushing:
- **Vercel** picks up frontend changes and rebuilds in ~1 minute
- **Railway** picks up backend changes and restarts in ~2–3 minutes

If a Railway deploy seems stuck or the API returns unexpected errors, check the Railway dashboard logs. The Volume (database) persists across deploys.

---

## 5. Authentication

### How login works

Olfactori uses **Google OAuth**. Users click Sign In, get redirected to Google, and Google sends them back to the backend with a code. The backend exchanges that code for a user profile (email), checks if they are allowed in, and issues a JWT (JSON Web Token) that the frontend stores in `sessionStorage`. Every API call that requires authentication sends this token in the `Authorization` header.

### Who can log in

- **You (admin)** — always allowed, determined by the `ADMIN_EMAIL` environment variable on Railway
- **Invited friends** — anyone in the `friends` table who has not been revoked
- **Everyone else** — redirected to an "Access Restricted" page

### Managing invites

Go to **Admin → Friends**. Add a friend's email and copy the invite link to send to them. You can revoke access at any time — revoked users are blocked on their next login attempt.

### Railway environment variables

These must be set in Railway → your service → Variables:

| Variable | Source |
|---|---|
| `GOOGLE_CLIENT_ID` | Google Cloud Console → Sillage project → Credentials |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console → Sillage project → Credentials |
| `JWT_SECRET` | A long random string — never share this |
| `ADMIN_EMAIL` | Your Google account email address |
| `FRONTEND_URL` | `https://www.olfactori.vip` |
| `BACKEND_URL` | `https://olfactori-production.up.railway.app` |
| `DB_PATH` | `/data/sillage.db` |
| `R2_ENDPOINT` | Cloudflare R2 endpoint URL |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 access key |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 secret key |
| `R2_BUCKET` | `olfactori-images` |
| `R2_PUBLIC_URL` | Your R2 public bucket URL |

### Google Cloud Console

The OAuth credentials live in a Google Cloud project called **Sillage**. If credentials need to be regenerated:

1. Go to `console.cloud.google.com` → select Sillage project
2. APIs & Services → Credentials → your OAuth 2.0 Client
3. The redirect URI must be exactly: `https://olfactori-production.up.railway.app/api/auth/callback`

---

## 6. Fragrance Enrichment

Enrichment pulls additional data (notes, concentration, perfumer, images) for collection entries from external sources.

### Fragella API

The primary enrichment source. Called from the backend only — never directly from the frontend.

| Detail | Value |
|---|---|
| Base URL | `https://api.fragella.com/api/v1` |
| Auth header | `x-api-key` |
| Image field | `Image URL` (note the space — not `ImageUrl`) |

The API key is stored in `api/routers/fragrances.py`.

### Fragrantica (fimgs CDN)

When a Fragrantica URL is stored for a fragrance, the backend extracts the numeric ID from it and builds a direct CDN URL: `https://fimgs.net/mdimg/perfume-thumbs/375x500.{id}.jpg`. This is faster and more reliable than scraping.

### Enrichment endpoints

| Endpoint | What it does |
|---|---|
| `POST /fragrances/{id}/enrich/smart` | Fill only missing fields |
| `POST /fragrances/{id}/enrich/rescrape` | Re-fetch everything, show conflicts for review |
| `POST /fragrances/{id}/enrich/image/preview` | Preview new image without saving |
| `POST /fragrances/{id}/enrich/apply` | Save reviewed enrichment data (auto-mirrors image to R2) |

### How Refresh Image works

1. Click **Refresh Image** in the Enrich tab → calls `enrich/image/preview`
2. Backend checks for a stored Fragrantica URL (fast CDN path) or queries Fragella (slower)
3. Preview modal shows the candidate image
4. Click **Yes, use this image** → calls `enrich/apply`
5. Backend saves the new image URL and **automatically mirrors it to R2** — `r2_image_url` is updated
6. The new image displays immediately from R2

### Triggering enrichment

- **Per-fragrance:** Edit tab → Enrich sub-tab → Fill Missing / Re-scrape All / Refresh Image
- **Bulk:** Admin → Batch Enrich

---

## 7. Image Storage

All images serve from Cloudflare R2. The `r2_image_url` field takes display priority.

### Image fields (per fragrance)

| Field | Meaning |
|---|---|
| `r2_image_url` | Mirrored copy on Cloudflare R2 — always shown first |
| `custom_image_url` | User-entered URL — shown if no R2 URL |
| `fragella_image_url` | URL from Fragella API — shown if no R2 or custom URL |

### Auto-mirroring rules

Images are automatically mirrored to R2 (and `r2_image_url` updated) in these situations:
- Saving a new image via Refresh Image (`enrich/apply`)
- Entering a custom image URL in the Edit tab and saving (PATCH endpoint)
- Re-scraping a fragrance and applying the result

If mirroring fails (network error, bad source URL), the save still goes through and an error is printed to the Railway logs. The fallback image source will display instead.

### Bulk mirror

To mirror all images at once: **Admin → Images → Mirror All**. This catches any fragrances that were added before auto-mirroring was in place.

---

## 8. Access Control

### Admin vs. user

| Role | Access |
|---|---|
| Admin (you) | Full access: edit, delete, enrich, wear log, admin panel, batch operations |
| Invited users | Read-only access to whatever tabs you've toggled on |
| Public (not logged in) | Only tabs/features marked as public in Admin → Access Control |

### Per-tab toggles

In **Admin → Access Control**, each tab and feature can be toggled between public and private. Stored in the `security_settings` table, checked on every page load.

### Fixed rules (cannot be toggled)

- Edit, add, delete fragrances — admin only
- Batch enrich / scrape — admin only
- Admin tab — admin only
- Wear log — admin only
- Delete / Mark as Gone — admin only

---

## 9. Public Share Page

Your collection has a public-facing page anyone can view — no login required.

**URL:** `https://www.olfactori.vip/share/adam`

Bottles marked "Want to Trade" are highlighted with a gold badge. Visitors can submit a trade request, which you manage in **Admin → Trade Requests**.

Settings (display name, bio, which fields are shown, on/off) are in **Admin → Share Page**.

---

## 10. Database Backup

The database lives on a Railway Volume and persists across deploys. Back it up before major changes.

**Download:** Admin → Database Backup → Download. This downloads `sillage.db` directly from the Railway Volume.

**Restore:** If the database needs to be reset, go to Railway dashboard → your service → Volume and wipe it. On the next deploy, `startup.sh` will copy a clean `sillage.db` from the repo onto the Volume.

---

## 11. Quick Reference

| Item | Value |
|---|---|
| Live site | `https://www.olfactori.vip` |
| Share page | `https://www.olfactori.vip/share/adam` |
| Backend API | `https://olfactori-production.up.railway.app/api` |
| API health check | `https://olfactori-production.up.railway.app/api/health` |
| GitHub repo | `https://github.com/caldrumr1234-cmd/olfactori` |
| Local project path | `C:\Users\Adam\Desktop\Olfactori` |
| Railway project | `sublime-delight` / service: `olfactori` |
| Railway volume ID | `vol_qjelnaom0f3e85xm` |
| Google Cloud project | `Sillage` |
| Database (production) | `/data/sillage.db` (on Railway Volume) |
| Database (repo seed) | `data/sillage.db` (not used in production) |
