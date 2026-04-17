# 📖 Our Scrapbook — PWA

A cozy weekly photo scrapbook you can share with friends via a link.
Built as a Progressive Web App — works on any device, installable from the browser.

---

## Features
- 📷 Upload up to 4 photos per day
- ✏️ Draw on pages (pen, brush, highlighter, eraser)
- 🌸 Stickers — flowers, feelings, objects, washi tape
- ✍️ Add handwritten / typed notes in multiple fonts & colours
- 💬 Comment on photos
- 🎨 5 themes: Cream, Garden, Night, Rose, Slate
- 📅 Chronological weekly spreads — flip through like a book
- 🔗 Share with others via a code — they join and add photos too
- 📲 Installable as an app from your browser (iOS: Share → Add to Home Screen)

---

## Quick deploy to GitHub Pages (free hosting, shareable link)

### Step 1 — Push to GitHub
```bash
# In this folder:
git init
git add .
git commit -m "My scrapbook"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/scrapbook.git
git push -u origin main
```

### Step 2 — Enable GitHub Pages
1. Go to your repo on GitHub
2. Settings → Pages → Source: **Deploy from branch**
3. Branch: `main`, folder: `/ (root)` → Save
4. Your scrapbook will be live at: `https://YOUR_USERNAME.github.io/scrapbook/`

---

## Optional: Add cloud sync with Supabase (so friends see each other's photos)

Without this, photos are stored locally in each person's browser.
With Supabase, everyone in the same scrapbook sees all photos in real time.

### Step 1 — Create a free Supabase project
1. Go to https://supabase.com → New project
2. Copy your **Project URL** and **anon/public key** from Settings → API

### Step 2 — Create the database table
In Supabase → SQL Editor, run:
```sql
create table scrapbooks (
  id text primary key,
  name text,
  data text,
  updated_at timestamptz default now()
);

-- Allow public read/write (scrapbook is shared by code, not login)
alter table scrapbooks enable row level security;
create policy "Public access" on scrapbooks for all using (true) with check (true);
```

### Step 3 — Add your keys to app.js
Open `js/app.js` and replace lines 5–6:
```js
const SUPABASE_URL = 'https://xxxx.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

Then redeploy (push to GitHub).

---

## Sharing with friends
1. Open your scrapbook
2. Tap the bottom **Weeks** tab → scroll down to "Share this scrapbook"
3. Copy the code and send it to friends
4. They open the app URL, tap **Join**, paste the code + enter their name

---

## Customising the app name
Edit `manifest.json`:
```json
"name": "Sophie & Emma's Scrapbook",
"short_name": "Our Book",
```

## Making a custom icon
Replace `icons/icon-192.png` and `icons/icon-512.png` with your own designs.
Use https://maskable.app to make them "maskable" (looks great on Android).

---

## File structure
```
scrapbook/
├── index.html          ← main app
├── css/style.css       ← all styles + 5 themes
├── js/app.js           ← all logic
├── sw.js               ← service worker (offline support)
├── manifest.json       ← PWA config
└── icons/              ← app icons
```
