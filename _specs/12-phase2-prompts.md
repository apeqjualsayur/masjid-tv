# Phase 2 Build — Prompts (Claude Code or Antigravity)

Same method as Phase 1: **one prompt per session**, run in order, do the **Check** before moving on, **commit after every passing check** (`git add -A && git commit -m "2.x done"`). If a check fails, paste the error back and ask for a fix.

Sections marked **🧑 You** are manual steps in a browser; the agent cannot do them.

**Before 2.0:**
1. Copy from this pack into the project: `_specs/10-PRD-phase2.md`, `_specs/11-schema.sql`, `_specs/12-phase2-prompts.md`, the updated `_specs/01-theme-contract.md`, the updated root `AGENTS.md`, and the folder `designs/admin/` (12 phone + 4 computer admin mockups).
2. Recommended: export a PNG of each admin mockup from the "Masjid View Admin" design canvas into `designs/admin/ref/` with the same names (`Main.png`, `Home.png`, …) so the agent can compare screenshots.
3. **Antigravity:** Planning mode, review each plan, type `/verify` when it says done. **Claude Code:** ask it to run `npm test` and `npm run build` before saying done (AGENTS.md already requires this).

---

## 2.0 🧑 You — accounts and keys (≈45 min, one time)

**A. Supabase (dev project)**
1. Go to supabase.com → sign in with GitHub → **New project** → name `masjidview-dev`, region **Southeast Asia (Singapore)**, strong database password (save it in your password manager).
2. When ready: **Project Settings → API**. Copy the **Project URL** and the **anon / publishable key**. Also copy the **service_role / secret key** (never share it; never put it in app code).
3. **Database → Extensions** → enable **pg_cron**.

**B. Google sign-in**
1. console.cloud.google.com → create project **Masjid View**.
2. **APIs & Services → OAuth consent screen** → External → app name *Masjid View*, your support email → add your email as a test user → save. (Publish the app before the pilot so any Google account can sign in.)
3. **Credentials → Create credentials → OAuth client ID** → *Web application*.
   - Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback` (shown in Supabase → Authentication → Providers → Google).
4. Copy the **Client ID** and **Client secret** → Supabase → **Authentication → Providers → Google** → enable → paste → save.

**C. Supabase URL settings** — Authentication → URL Configuration:
- Site URL: `http://localhost:3000/admin` (change to `https://masjidview.my/admin` at go-live)
- Redirect URLs: `http://localhost:3000/admin`, `http://localhost:3000/admin/**`, your Cloudflare preview pattern (e.g. `https://*.masjid-tv.pages.dev/admin/**`), `https://masjidview.my/admin/**`

**D. Local env file** — in the project root create `.env.local` (the agent will check it is git-ignored):
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # scripts only, never in app code
```
Menu names in Supabase/Google change occasionally; if a step looks different, ask the agent "where is X now in the Supabase dashboard?".

---

## 2.1 Database schema + RLS check

```
Read _specs/10-PRD-phase2.md and _specs/11-schema.sql.
1. Create supabase/migrations/0001_init.sql as an exact copy of _specs/11-schema.sql (keep section 10 commented).
2. Confirm .env.local is in .gitignore. Never print the service role key.
3. Tell me step by step how to run the migration in the Supabase SQL editor (copy-paste), OR if the Supabase CLI is easy to set up here, set it up and run `supabase db push` against masjidview-dev — ask me which I prefer first.
4. Write scripts/rls-check.ts (run with `npm run rls-check`) that uses SUPABASE_SERVICE_ROLE_KEY only to create 3 test users (A, B, C) and then signs in AS those users with the anon key to verify, printing PASS/FAIL per line:
   - A registers org A; B registers org B (register_org)
   - before approval A cannot insert slides (but can upload a logo file to storage path A/…)
   - make test user P a platform admin; P approves both (review_org)
   - A can create a kuliah slide; A cannot read/insert/update anything of org B (slides, settings, screens, media, storage path B/…)
   - kematian with ends_at > 7 days is rejected
   - A calls register_org a second time → already_has_org; A cannot insert rows into members directly
   - A invite_member(org A, B's email) → user_has_org; A invites C → ok; A invites D while C is open → invite_pending; B invite_member into org A → not_allowed
   - C signs in → accept_invitations returns org A → C can update org A settings (equal admin) → C register_org → already_has_org → C invites D → org_full
   - B cannot read org_members(org A) or delete org A members; A removes C → ok; A removes self as last admin → last_pentadbir
   - anon: pair_start → code; A pair_claim with wrong code fails, right code succeeds; D (no masjid) pair_claim for org A fails
   - anon screen_bundle returns status ok + version; second call with that version returns unchanged; after A updates iqamah the version increases; after revoke returns revoked
   - P rejects org B; B registers again → succeeds and the rejected org is gone
   - transfer_org: A calls it → not_allowed; P adds D to org A (1 admin) → ok; P adds C → org_full; P replaces A by C → C sees org A, A sees no orgs; P adds an email that already owns a masjid → user_has_org
   - cleanup: delete all test users and orgs at the end (even if a test fails)
5. Do not change the schema to make a test pass. If a test fails, stop and show me which and why.
```
**Check:** `npm run rls-check` → all PASS. Then run section 10 (cron) in the SQL editor. Then in SQL editor: `select count(*) from organisations;` → 0 (cleanup worked).

---

## 2.2 Admin shell, sign-in, i18n

```
Build the admin app foundation per PRD §4.1, §5, §9 and designs/admin/Main.dc.html and Home.dc.html (read markup + inline styles; they do not run standalone).
- src/lib/supabase.ts: single browser client from NEXT_PUBLIC_ env vars; session persisted.
- Static export: NO dynamic route segments ([id]); use query params. All admin pages are client components.
- /admin: sign-in page — "Teruskan dengan Google" (primary, signInWithOAuth) and email magic link (signInWithOtp); BM/EN toggle; link to /privasi (placeholder page for now).
- After sign-in, call accept_invitations(), then route per PRD §4.1 (one masjid per account: none → /admin/daftar, pending or rejected → /admin/menunggu, active → /admin/utama; platform owner also gets the Platform link).
- Responsive admin layout per PRD §5.1: phone (< 768 px) bottom nav (Utama, Kandungan, Skrin, Tetapan); tablet centred column max 640 px; computer (≥ 1024 px) left sidebar per designs/admin/D-Home.dc.html (logo, masjid name, nav incl. Ahli, user, BM/EN, sign out). PRD §3: one masjid per account and max 2 equal admins, so no masjid switcher and no editor role; ignore those elements if a design still shows them. On phone, Ahli is reached from Tetapan. Dialogs: bottom sheet on phone, centred modal on computer. One component tree; layout via CSS breakpoints + a useIsDesktop() hook only where structure differs.
- i18n: src/admin/i18n/ms.json + en.json, a tiny useT() hook (no new dependency unless you justify it), language from profiles.lang + localStorage, default ms. No hard-coded UI strings.
- Visual tokens from PRD §5 (green #146C4A, ink #12261E, ground #F4F7F5, Plus Jakarta Sans self-hosted), tap targets ≥ 44 px.
- /admin/utama: real data — org name, role, next prayer (reuse Phase 1 engine with the org's zone), screens list with online/offline (last_seen within 3 min), "Sedang dipapar" (published, current slides). Phone = designs/admin/Home.dc.html; computer = D-Home.dc.html (two columns, today's 7 times).
- Route guard: unauthenticated → /admin.
```
**Check:** on your phone (same WiFi, `npm run dev -- -H 0.0.0.0`, open `http://<laptop-ip>:3000/admin`) and laptop: Google sign-in works; magic link works; BM/EN switches every label; you land on Daftar masjid (no org yet). Resize the laptop browser from wide to narrow: sidebar switches to bottom nav at < 1024 px without losing your place.

---

## 2.3 Registration + pending

```
Build /admin/daftar (2 steps) and /admin/menunggu per PRD §4.2 and designs/admin/Register.dc.html and Pending.dc.html.
- Zone picker exactly per PRD §4.2 "Choosing the JAKIM zone" (design: Register.dc.html, all 3 states of the "zoneCase" tweak). Build it as a reusable component src/admin/ZonePicker (Tetapan will reuse it in 2.5):
  1. "Guna lokasi saya": navigator.geolocation (timeout 10 s, high accuracy) → Waktu Solat API GPS-to-zone endpoint. First check the API docs for the current GPS path and make ONE real test call from the terminal with KL coordinates (3.1390, 101.6869) to show me the response shape. Do not store coordinates.
  2. Fallback lists from src/data/zones.json: Negeri → Daerah/kawasan; derive the area list per zone from the zone descriptions. If an area appears in more than one zone, show radio options with each zone's full area list.
  3. Confirmation card: zone code, source label, area list, today's 6 times for that zone using the Phase 1 data layer (formatted 12h), "Sama dengan jadual di masjid anda?", and "Tukar zon" → searchable list of all zones.
  4. Errors (permission denied, timeout, API down, offline) fall back to the lists with a short BM/EN message; never block registration.
  Unit tests: area→zone mapping incl. multi-zone areas, GPS response parsing, fallback behaviour.
- Logo optional: compress in browser to WebP ≤ 512 px. Upload only after the org exists: call register_org first, then upload to media/{org_id}/{uuid}.webp, insert the media row (kind 'logo'), then call set_org_logo(org_id, path) (already in the schema; org_update RLS only allows ACTIVE orgs, this function works while pending). Use set_org_logo in Tetapan too.
- Validation per schema limits; friendly BM/EN errors (too_many_pending etc).
- Pending page shows the submitted details + setup tips + sign out.
```
**Check:** on your phone at home, tap "Guna lokasi saya" → correct zone + today's times match the JAKIM e-Solat website. Deny location permission → lists still work. Pick a district that spans two zones (ask the agent which ones exist in zones.json) → you must choose. Register a test masjid → lands on Menunggu. In SQL editor make yourself platform owner (see 11-schema.sql §11).

---

## 2.4 Platform owner page (+ emails)

```
Build /admin/platform per PRD §4.3 and designs/admin/Admin.dc.html. Visible only if is_platform_admin().
- Tabs Menunggu / Aktif / Digantung; cards with org details, registrant email (read via a new SECURITY DEFINER function platform_org_list() that joins auth.users — add it as migration 0002 with is_platform_admin() check; show me the SQL before applying).
- Actions: Lulus, Tolak (reason required), Gantung (reason required), Aktifkan semula → review_org(). On Aktif cards also **Tukar akaun**: shows the masjid's admins (org_members); enter a new email and either "Tambah" (only if 1 admin) or "Ganti <email>" → confirm dialog ("<email lama> akan hilang akses serta-merta") → transfer_org(org, email, replace_email or null); friendly messages for user_not_found ("Minta mereka log masuk di /admin sekali dahulu"), user_has_org and org_full.
- Header counts: active, pending, screens online / total, total storage used (sum media.bytes) per org.
- Emails (can be postponed): a Supabase Edge Function `notify` using Resend that emails (a) the platform owner when a new org registers, (b) the registrant when approved/rejected. Trigger it from the client after register_org/review_org succeed. Give me non-coder steps to create the Resend account, verify the domain later, and set the function secret. If I say "postpone", skip this part.
```
**Check:** approve your test masjid → sign in again → lands on Utama. Reject a second test masjid with a reason → its user sees the reason.

---

## 2.5 Tetapan (settings + branding)

```
Build /admin/tetapan per PRD §4.6 and designs/admin/Settings.dc.html.
Sections: Jenama (logo upload/replace with WebP ≤ 512 px, full/short name, 5 accent swatches), Zon JAKIM (reuse src/admin/ZonePicker; confirm dialog before saving a new zone: "Semua skrin akan menggunakan waktu solat zon baharu"), Waktu iqamah (5 steppers 1–30), Jumaat (khutbah 10–60, Solat Jumaat 5–30, "Papar info Jumaat" switch — stored in durations.khutbahMin / jumaatSolatMin / showFridayInfo — with a live example line "Azan 1:05 · Khutbah 1:08 (±40 minit) · Solat ±1:48" using this Friday's Zohor), Paparan (Arabic on/off, 12j/24j, ticker up to 5 × 140 chars), Aplikasi (language BM/English saved to profiles.lang; link to Ahli; sign out).
Save with optimistic UI and clear success/error toasts. Replacing a logo deletes the old file from storage.
```
**Check:** change Maghrib iqamah to 8 → SQL editor `select bundle_version from organisations` increased.

---

## 2.6 TV pairing (TV side + admin side)

```
Implement PRD §4.4.
TV (/tv):
- On first load with no saved pairing and not ?local=1: generate a 64-char random secret (crypto.getRandomValues), store in localStorage AND IndexedDB, call pair_start, show the pairing screen exactly like designs/admin/TVPair.dc.html (1920×1080 stage, 6-digit code, real QR code encoding https://<host>/admin/skrin?pair=<code>, countdown; new code automatically on expiry). Poll pair_status every 5 s. Justify any QR library you add.
- Status 'paired' → go to display (sync built in 2.7; for now show "Disambungkan" + screen name).
Admin (/admin/skrin):
- List screens per designs/admin/Screens.dc.html (mini preview by theme, online/offline, theme · layout, last seen).
- "Tambah skrin" sheet: 6 code boxes (auto-advance, paste support), pre-filled from ?pair=, screen name, theme (Alam/Serambi/Tenang with thumbnails), layout (Penuh/Bar bawah/Bar sisi) → pair_claim. Friendly errors: invalid_code, too_many_attempts.
- Per screen: rename, change theme/layout, revoke (confirm dialog), delete.
```
**Check:** laptop browser `/tv` shows code → phone scans QR → claim → TV shows "Disambungkan" within 10 s. Revoke → TV returns to code screen after its next sync (after 2.7).

---

## 2.7 TV sync from Supabase (replaces screen.json)

```
Implement PRD §7 on the TV:
- src/data/bundle.ts: every 60 s call screen_bundle(secret, lastVersion, appVersion). 'ok' → validate shape, store in IndexedDB, apply; 'unchanged' → nothing; 'revoked' → wipe pairing, show pairing screen; 'suspended' → show a calm "Paparan digantung sementara. Hubungi AJK." screen with the clock.
- Map bundle → existing config + slides used by the Phase 1 engine/playlist (theme, layout, masjid names, logo URL = NEXT_PUBLIC_SUPABASE_URL + /storage/v1/object/public/media/ + path, accent, zone, iqamah, durations, Arabic, clock, ticker, slides with schedule rules incl. days_of_week and screen targeting already filtered).
- If the zone changes, fetch prayer times for the new zone (Phase 1 data layer).
- Offline: start from the IndexedDB bundle immediately on boot; network errors never blank the screen.
- Service worker: cache-first for media URLs; prune cached images not referenced by the current bundle (keep logo).
- Keep ?local=1 mode using public/config/screen.json + sample-slides.json.
- Debug overlay (?debug=1): bundle version, last sync time, status, screen name.
Unit tests: bundle mapping, schedule filtering (start/end/days), revoked/suspended handling, offline boot from cache.
```
**Check:** change iqamah or theme on phone → TV updates within ~60 s. Turn WiFi off → TV keeps running; on → syncs. Revoke → pairing screen.

---

## 2.8 Poster upload

```
Build /admin/poster per PRD §6 and designs/admin/Poster.dc.html.
- "Saiz disyorkan untuk skrin anda": one row per non-revoked screen by layout (bottom 1920×800, side 1350×1080, full = not shown).
- File pick (JPG/PNG/WebP ≤ 10 MB) → read dimensions → compress in a Web Worker to WebP q0.82, long edge ≤ 1920 → show before/after size.
- Resolution warning if upscaled > 1.4× on any target screen; fit label per screen (Penuh ≥85%, Dengan latar kabur 50–85%, Kecil di skrin <50%) with a mini preview drawn with the real poster (contain + blurred fill) in each screen's layout proportions.
- Next: schedule (shared component with 2.9) → upload to media/{org_id}/{uuid}.webp → media row → slide (type poster).
- Edit mode (?id=): replace image (delete old file) or change schedule.
- Computer (≥ 1024 px) per designs/admin/D-Poster.dc.html: drag-and-drop zone (also accepts paste from clipboard), recommended sizes + file check on the left, larger side-by-side previews per screen on the right, and a note when the poster fits only one layout well.
Justify any compression library; prefer canvas/OffscreenCanvas without dependencies.
```
**Check:** upload a phone photo → under 500 KB, appears on TV within ~60 s, uncropped with blurred edges.

---

## 2.9 Template editor (10 templates) with live preview

```
Build /admin/baru (designs/admin/Picker.dc.html) and /admin/templat?key=&id= (designs/admin/Editor.dc.html).
- Extend src/templates/ schemas (from Phase 1) with validation (zod is acceptable — justify) and field metadata (label ms/en, type: text, longtext, date, time-choice, number, money, image, table, select). Generate the form from the schema; no hand-written form per template.
- Live preview: render the REAL theme template component for the masjid's chosen theme and layout inside the Phase 1 Stage, scaled to the phone width; a "Tukar" control previews other screens' theme/layout. Mock DisplayState uses today's real prayer times for the org's zone.
- Schedule section (shared): starts/ends, duration stepper 5–120 s, day chips, priority, target screens (Semua / pilih).
- Kematian: end date required, default +3 days, max 7, sober note in UI. Ayat: choose from src/templates/ayat-sources.json (create it with 10 well-known ayat/hadith entries, Arabic + Malay translation + reference, and mark the file "TO BE VERIFIED BY AN USTAZ" at the top) — no free-text translation.
- Infaq: optional QR image upload (WebP ≤ 800 px). Imam & Bilal: 5×2 table. Kewangan: dynamic rows.
- Buttons: Simpan draf, Terbit; edit existing; "Duplikasi untuk minggu depan" (+7 days) for kuliah/imam_bilal/kewangan.
- Computer (≥ 1024 px) per designs/admin/D-Editor.dc.html: sticky top bar with Simpan draf/Terbit, form left (440 px), large live preview right (≥ 720 px) with a screen selector, updating as you type (debounce 150 ms).
```
**Check:** create one of each template; each looks the same in preview and on the TV for all 3 themes.

---

## 2.10 Kandungan (playlist)

```
Build /admin/kandungan per designs/admin/Content.dc.html.
- Tabs Aktif (published, started, not ended) / Dijadual (published, future, or draft) / Tamat (ended); counts.
- Drag to reorder (justify @dnd-kit or similar; must work by touch) with up/down buttons as accessible fallback; save sort_order in one batch.
- Pause/resume switch (status published ↔ paused), tap row → edit, swipe or menu → Duplikasi, Padam (confirm; deletes the poster/QR file too).
- Priority and Kematian badges; "Tamat auto" text for kematian.
- Computer (≥ 1024 px) per designs/admin/D-Content.dc.html: table with columns drag, type, title, dates, seconds, days, screens, show switch, ⋯ menu; toolbar with tabs, search and screen filter; mouse drag to reorder.
```
**Check:** reorder on phone → TV order changes on next sync; pause → slide disappears from TV.

---

## 2.11 Ahli — two equal admins

PRD §3 (v0.3): max 2 equal admins per masjid, one masjid per account.

```
Read PRD §3 and _specs/11-schema.sql (v0.3: invitations, members_max_two, invite_member, accept_invitations, org_members, transfer_org).
1. Check which schema the dev database has, using the two "Check" queries at the top of _specs/13-account-rules-migration.sql (tell me exactly where to paste them). If invite_member does not exist yet, copy the file to supabase/migrations/ as the next number, explain in plain words what it changes (including that open invitations are cancelled and, on an old v0.1 database, extra members beyond 2 are removed), and help me run it.
2. Build /admin/ahli (same visual system; phone: reached from Tetapan; computer: sidebar item):
   - Two slots from org_members(): name/email, "Anda" badge on my row, joined date.
   - Slot 2 empty → "Jemput pentadbir kedua" (email) → invite_member → show a share message to copy to WhatsApp: "Anda dijemput sebagai pentadbir paparan Masjid View untuk <masjid>. Log masuk dengan e-mel <email> di https://<host>/admin dalam 14 hari." Show the open invitation with its expiry and "Batal" (delete from invitations).
   - Remove the other admin (confirm: "<email> akan hilang akses serta-merta") and "Keluar dari masjid ini" for myself (hidden when I'm the only admin).
   - Friendly BM/EN messages for user_has_org ("E-mel ini sudah mengurus masjid lain"), org_full, invite_pending, org_not_active, bad_email, last_pentadbir.
3. Remove anything left from earlier attempts that conflicts: editor role branches, masjid switcher.
4. Registration: if register_org returns already_has_org, show "Akaun ini sudah mengurus sebuah masjid" and route correctly. On /admin/menunggu for a rejected masjid, show the reason and a "Daftar semula" button.
5. Update scripts/rls-check.ts to match prompt 2.1 (v0.3 list) and run `npm run rls-check`.
```
**Check:** `npm run rls-check` → all PASS. Invite your second Google account → sign in with it → it lands on Utama of the same masjid and can open Tetapan. From the first account, try inviting a third email → the invite button is gone (2/2). Remove the second account → it lands on Daftar masjid on its next visit.

---

## 2.12 Hardening & go-live

```
1. /privasi page (BM/EN): what data is stored (AJK names/emails/phones, announcement content incl. names of the deceased), why, retention (kematian purged 30 days after ending), contact email, how to request deletion. Mark "DRAF — perlu semakan" at the top.
2. Error handling: global error boundary in admin with friendly message; log errors to console with context; no secrets in logs.
3. Backups: GitHub Action (weekly) that runs pg_dump against the PROD database using a repo secret, stores the dump as a private workflow artifact (90-day retention). Non-coder steps for adding the secret.
4. Production: steps to create masjidview-prod, run migrations 0001–000N, enable pg_cron + cleanup job, Google provider, URL config with the real domain, custom SMTP (Resend) for auth emails, Cloudflare env vars per environment (preview → dev project, production → prod project).
5. Write _specs/13-phase2-test-plan.md mapping every PRD §12 acceptance criterion to a manual or automated check, and run the automated ones.
6. Final review: grep the repo for the service role key name and any hard-coded URLs/keys; report.
```
**Check:** all PRD §12 criteria pass on prod with a real pilot masjid.
