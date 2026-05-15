# The Peoples Butchery — Developer Handover
**For: Antigravity | From: Claude (kops147@gmail.com session)**

---

## Project Overview
Live butchery ordering site for The Peoples Butchery, East Lynne, Pretoria.
- **Live URL:** https://thepeoplesbutchery.co.za
- **GitHub:** https://github.com/Kops147/peoples-butchery (main branch → auto-deploys via GitHub Pages)
- **No backend server** — 100% static files on GitHub Pages
- **Database:** Supabase (PostgreSQL) — free tier

---

## Tech Stack
| Layer | Tech |
|---|---|
| Hosting | GitHub Pages |
| Database | Supabase (PostgreSQL + Auth) |
| Auth | Supabase Auth (customers) + PIN (admin) |
| Images | Served from `assets/img/food/` (no cloud storage) |
| Maps/Geocoding | Photon (Komoot) — free, no API key |

---

## Supabase Project
- **Project URL:** `https://qhlzbphdvfundrmejzzf.supabase.co`
- **Anon key:** in `js/supabase-config.js` (safe to be public)
- **Service role key:** DO NOT put in client-side code — keep in Supabase dashboard only
- **Tables:** `users`, `products`, `orders`
- **RLS:** open policies (all read/write allowed — fine for local butchery, tighten later if needed)

### Supabase Auth Settings
- Email confirmations: **OFF** (already disabled — leave it off)
- Google OAuth: wired in code, needs Google Cloud Console credentials in Supabase → Auth → Providers → Google

---

## Admin Access
- URL: `https://thepeoplesbutchery.co.za/admin.html`
- PIN: `peoplesV2_2024`
- Super Admin PIN: `yType_Dev_2026`
- Admin is **not** a Supabase Auth user — PIN-based local auth via `app.js`

---

## Key Files
```
js/
  supabase-config.js   ← Supabase client (URL + anon key)
  supabase-orders.js   ← saveOrderToSupabase(), getUserOrdersFromSupabase()
  catalog.js           ← LOCAL_CATALOG (15 products, seeds Supabase on first admin load)
  admin.js             ← Admin portal (ES module — type="module" in admin.html)
  shop.js              ← Shop page, cart, checkout (ES module)
  dashboard.js         ← Customer dashboard — reads live from Supabase (ES module)
  chat.js              ← Rule-based bot "Lebo" — no API key needed, fully offline
  app.js               ← Auth (sessionStorage), DB (localStorage mock), helpers

assets/img/food/
  manifest.json        ← Array of all image filenames for the photo picker
  *.jpeg / *.jpg       ← Product photos served directly from GitHub Pages

admin.html             ← Admin portal
shop.html              ← Customer shop
dashboard.html         ← Customer account dashboard
register.html          ← Customer registration (Supabase Auth signUp)
login.html             ← Customer login (Supabase Auth signInWithPassword)
```

---

## What Works ✅
- Customer registration → Supabase Auth + `users` table
- Customer login (email/password)
- Google Sign-In button wired (needs Google Cloud credentials in Supabase to activate)
- Admin portal reads customers, orders, products live from Supabase
- Admin credits customer → customer dashboard balance updates on next load
- Checkout deducts credit from Supabase live balance
- Order saved to Supabase `orders` table
- Admin changes order status → updates Supabase immediately
- Product photo picker with lazy-loading shimmer placeholders
- Lebo chat bot (rule-based, no server needed)
- Products auto-seed to Supabase from `catalog.js` on first admin page load

---

## Known Issues / Pending Work 🔧

### 1. Address autocomplete missing on registration page
**File:** `register.html` (Step 2 — Address & Contact)
**Problem:** The suburb/address fields (`r-suburb`, `r-address`) have no live autocomplete. The user has to type the full address manually.
**Fix needed:** Wire up Photon geocoder to `r-address` input — same pattern as `js/shop.js` lines ~374–447 (the cart delivery address autocomplete). The Photon URL to use:
```
https://photon.komoot.io/api/?q={query}&lat=-25.7219&lon=28.3412&limit=5&lang=en&bbox=27.8,-25.9,28.7,-25.5
```
The `bbox` parameter locks results to Pretoria/Tshwane area.

### 2. Geocoding finds wrong "Virginia" (Free State, not Pretoria)
**File:** `js/shop.js` — `initDeliveryLocation()` around line 387
**Problem:** Photon returns Virginia, Free State instead of Eersterust because country filter alone isn't enough — both are in ZA.
**Fix:** Add `bbox=27.8,-25.9,28.7,-25.5` to the Photon query URL to constrain to Pretoria metro area.
**Current URL (line ~387):**
```javascript
const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lat=${STORE_COORDS.lat}&lon=${STORE_COORDS.lng}&limit=5&lang=en`;
```
**Fix:**
```javascript
const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lat=${STORE_COORDS.lat}&lon=${STORE_COORDS.lng}&limit=5&lang=en&bbox=27.8,-25.9,28.7,-25.5`;
```
Apply the same fix to `register.html` when adding the autocomplete.

### 3. Dashboard orders list (minor)
Orders placed via Supabase show correctly. The `items` field in the `orders` table is a JSONB array of `{ productId, quantity }`. The dashboard order cards show item count but not item names. A nice improvement would be to resolve product names from the `products` table when rendering order cards.

### 4. Transactions tab
Currently reads from localStorage only. Should be moved to a Supabase `transactions` table for cross-device visibility.

### 5. Password change
Wired to `supabase.auth.updateUser({ password })` — works but requires the user to be in an active Supabase Auth session (they may need to re-login if session expired).

---

## Adding New Products
1. Go to `admin.html` → Products → Add New Product
2. Fill in name, category, price, unit
3. Click "Browse Photos" to pick from the library
4. To add new photos to the library: commit the image to `assets/img/food/` AND update `assets/img/food/manifest.json` (add the filename to the JSON array)

## Adding New Products to Default Catalog
Edit `js/catalog.js` — add entry to `LOCAL_CATALOG`. The admin page auto-seeds these to Supabase when the products table is empty.

---

## Deployment
Push to `main` branch → GitHub Pages auto-deploys in ~30 seconds.
```bash
git add .
git commit -m "your message"
git push origin main
```

---

## Environment Notes
- No `.env` files — Supabase anon key is safe in client-side JS (it's designed to be public)
- No build step — vanilla JS ES modules loaded directly in browser
- No npm / node_modules — nothing to install
- Test in Chrome first (Firefox has minor CSS quirks in the admin photo picker modal)
