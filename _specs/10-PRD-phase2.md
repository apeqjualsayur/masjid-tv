# Masjid View — Phase 2 PRD: Admin Panel & Content (v0.1)

> Builds on Phase 1 (`00-PRD.md`, `01-theme-contract.md`). Phase 1 must pass its acceptance criteria first; steps 2.0–2.4 below may start in parallel because they do not touch the display.
> Platform name: **Masjid View**. Placeholder domain: `masjidview.my` (confirm availability).

---

## 1. Goal

AJK manage their own screens from a phone, without the platform owner: register the masjid, pair TVs, post announcements and posters, change settings. Every change reaches the TV within **60 seconds**. TVs keep working offline exactly as in Phase 1.

**Exit criteria:** a pilot AJK, unaided, can (1) sign in with Google, (2) register their masjid, (3) after approval pair a TV, (4) publish a Kuliah announcement and a poster, (5) change Maghrib iqamah minutes, and see all of it on the TV within 60 s.

## 2. Decisions (locked)

| Topic | Decision |
|---|---|
| Login | **Google sign-in (primary)** + email magic link (backup). No passwords, no SMS |
| Registration | Open signup → status `pending` → platform owner approves |
| Admin language | **BM default, English toggle** (admin app only; TV stays BM) |
| Hosting | Static export on Cloudflare Pages. Domain at Hostinger. **One domain, paths:** `/tv` (display), `/admin` (admin app). Subdomain aliases can be added later without code change |
| Backend | Supabase: Auth, Postgres with Row Level Security (RLS), Storage. One Edge Function (emails) is the only server code |
| TV updates | TV polls one function every 60 s with its last version; downloads only when changed |
| Prayer times | Unchanged from Phase 1 (JAKIM API + cache + bundled fallback) |

## 3. Roles & permissions

| Action | Editor | Pentadbir | Platform owner |
|---|---|---|---|
| View own masjid's content, screens, settings | ✅ | ✅ | ✅ (all masjids) |
| Create / edit / pause / delete slides & posters | ✅ | ✅ | — |
| Change settings, branding, iqamah | — | ✅ | — |
| Pair / rename / revoke screens; change theme & layout | — | ✅ | — |
| Invite / remove members | — | ✅ | — |
| Approve / reject / suspend masjids | — | — | ✅ |

- A user may belong to more than one masjid (org switcher in header).
- A masjid must always keep at least one Pentadbir (enforced in DB).
- Platform owners are listed in `platform_admins` (added manually via SQL).

## 4. Flows

### 4.1 Sign in
`/admin` → **Teruskan dengan Google** (primary) or email → magic link. After sign-in:
1. Accept any pending invitations for this email (`accept_invitations()`).
2. Route: platform owner → can open Platform page; user with 0 masjids → Daftar masjid; with pending masjid only → Menunggu kelulusan; else → Utama.

### 4.2 Register masjid (`register_org`)
Fields: jenis (Masjid/Surau), nama penuh, nama ringkas, **lokasi untuk waktu solat** (below), alamat (optional), logo (optional, else monogram), telefon pegawai. Creates org (`pending`), member (Pentadbir), default settings. Max 3 pending registrations per user.

**Choosing the JAKIM zone** (design `admin/Register`, tweak "Contoh zon"):
1. **Guna lokasi saya** (primary): browser geolocation → zone lookup via the Waktu Solat API GPS endpoint (verify the current path in https://api.waktusolat.app/docs; the older `/v2/solat/{lat}/{long}` is marked deprecated). Hint: "Paling tepat jika anda berada di masjid sekarang". Coordinates are used for the lookup only and **not stored** (PDPA).
2. **Atau pilih** (fallback, or if permission denied / lookup fails / offline): Negeri → Daerah/kawasan lists built from `src/data/zones.json`. One zone → set automatically.
3. **Area spans several zones** → show each candidate zone as a radio option with its full area list; user must pick one.
4. **Confirmation card** (always): "Zon JAKIM: SGR01", source label (Dikesan melalui lokasi / Daripada kawasan / Dipilih), the zone's area list, and **today's 6 times** (Subuh, Syuruk, Zohor, Asar, Maghrib, Isyak) fetched for that zone, with the prompt **"Sama dengan jadual di masjid anda?"** and a **Tukar zon** link (opens a searchable list of all zones). If the times can't be fetched, show the zone without times and continue.
5. Store `state`, `district` and `zone`. Pentadbir can change the zone later in Tetapan using the same component (zone change bumps the bundle so TVs refetch prayer times).

### 4.3 Approval
Platform page: tabs Menunggu / Aktif / Digantung. **Lulus**, **Tolak** (reason required), **Gantung** (reason required). Email to registrant on decision; email to platform owner on new registration (Edge Function + Resend). Until emails are live, status is visible on next login.

### 4.4 Pair a TV
1. TV opens `/tv`. With no saved pairing it shows the **pairing screen** (design `admin/TVPair`): 6-digit code, QR, 3 steps, expiry countdown. TV generates a random secret, stores it locally, calls `pair_start(secret)`. Code valid 10 min; TV fetches a new one automatically.
2. QR encodes `https://masjidview.my/admin/skrin?pair=482913` — the phone's normal camera opens it; no in-app scanner needed.
3. Pentadbir: Skrin → **Tambah skrin** → code (pre-filled from QR) → screen name, theme, layout → **Sambungkan** (`pair_claim`).
4. TV polls `pair_status(secret)` every 5 s while showing the code; once paired it switches to the display.
5. **Revoke** in admin → TV's next sync returns `revoked` → TV wipes its pairing and shows the pairing screen.

### 4.5 Content
- **Templates (10)**: pick → schema-driven form → **live preview in the masjid's actual theme and layout** (same React components as the TV) → schedule → **Simpan draf** / **Terbit**.
- **Posters**: see §6.
- **Schedule fields** (all slides): starts_at, ends_at (optional), duration 5–120 s (default 15), days of week (optional), priority (shown twice as often), repeat weekly (Kuliah: duplicates with dates +7 days on publish of next week — implemented as a "Duplicate for next week" button in Phase 2), target screens (default all).
- **Kematian**: ends_at required, default **3 days**, max 7 (DB-enforced). Auto-deleted 30 days after ending (PDPA).
- **Ayat/Hadith**: translation chosen from an approved list shipped in the app (`src/templates/ayat-sources.json`), not free text.
- **Kandungan**: tabs Aktif / Dijadual / Tamat; drag to reorder; pause switch; duplicate; delete (also deletes the image file).

### 4.6 Settings (Tetapan)
Branding (logo, full name, short name, accent colour from 5 swatches), **zon JAKIM (same zone picker + confirmation card as registration)**, iqamah minutes per waktu (1–30), khutbah minutes, pre-azan/azan/solat durations, Arabic names on/off, clock 12h/24h, ticker lines (max 5 × 140 chars), app language. Zone can be changed by Pentadbir (rare: masjid moved).

## 5. Screens (designs in `designs/admin/`)

| Route | Design | Notes |
|---|---|---|
| `/admin` (sign in) | `Main` | BM/EN toggle |
| `/admin/daftar` | `Register` | 2 steps; step 2 = review & submit |
| `/admin/menunggu` | `Pending` | |
| `/admin/utama` | `Home` | next prayer from Phase 1 engine for the org's zone |
| `/admin/kandungan` | `Content` | |
| `/admin/baru` | `Picker` | |
| `/admin/poster?id=` | `Poster` | new or edit |
| `/admin/templat?key=kuliah&id=` | `Editor` | new or edit |
| `/admin/skrin` (`?pair=`) | `Screens` | pairing sheet |
| `/admin/tetapan` | `Settings` | |
| `/admin/ahli` | — | members & invitations (simple list, same style) |
| `/admin/platform` | `Admin` | platform owner only |
| `/tv` (unpaired) | `TVPair` | |
| `/privasi` | — | privacy notice BM/EN |

**Static export rule:** no dynamic route segments (`[id]`). Use query params as above.

Admin visual system: deep green `#146C4A`, ink `#12261E`, ground `#F4F7F5`, cards `#FFFFFF`, muted `#51655C`, border `#C9D8D0`, gold `#E3B04B`; font Plus Jakarta Sans; radius 12–18; touch targets ≥ 44 px; designed at 390 px wide, must work 360–430 px and on tablet/desktop (max-width 480 px centred column).

## 6. Posters

**Recommended sizes (shown per paired screen, by layout):**

| Layout | Recommended | Poster area ratio (all themes, see theme contract §2.10) |
|---|---|---|
| Bottom (`bottom`) | **1920 × 800 px** | 12:5 |
| Side (`side`) | **1350 × 1080 px** | 5:4 |
| Full (`full`) | Posters not shown | — |

**Upload rules:** JPG/PNG/WebP, ≤ 10 MB, warn if width < 1080 px.
**Fit check** (per target screen): coverage = displayed poster area ÷ poster area; ≥ 85 % "Penuh"; 50–85 % "Dengan latar kabur"; < 50 % "Kecil di skrin". Resolution warning if the image would be upscaled > 1.4× on any target screen.
**Processing in the browser** before upload: convert to WebP, quality 0.82, long edge ≤ 1920 px (logos ≤ 512 px). Store width/height/bytes in `media`. Show "2.4 MB → 310 KB".
**TV:** uncropped (`contain`) with blurred copy as background (Phase 1 rule). Images cached once (URLs are immutable).

## 7. Architecture

```
Phone /admin ──supabase-js (user session, RLS)──▶ Supabase Postgres + Storage
TV /tv ──every 60 s: screen_bundle(secret, version)──┘  → IndexedDB copy → Phase 1 engine + themes
```

- **Client:** same Next.js repo, static export. `src/lib/supabase.ts` creates one browser client from `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public by design; RLS protects data). **The service-role key never appears in app code** (only in local scripts/CI secrets).
- **TV has no user account.** It authenticates with its device secret through three `SECURITY DEFINER` functions only: `pair_start`, `pair_status`, `screen_bundle`. Anon has no table access.
- **Versioning:** `organisations.bundle_version` is bumped by triggers whenever slides, settings, branding or screen config change. `screen_bundle` returns `{status:'unchanged'}` when the TV's version is current (tiny response).
- **Bundle content:** screen (name, theme, layout), org (names, kind, zone, accent, logo path), settings, published slides that have not ended and start within 7 days (TV applies exact start/end/days itself, so it stays correct offline), media paths + sizes.
- **Storage:** public bucket `media`, path `{org_id}/{uuid}.webp`. Public read (TV needs it; paths are unguessable UUIDs); write/delete only by members of that org (storage policies).
- **Offline:** TV keeps the last bundle in IndexedDB and posters in the service-worker cache; prunes images no longer referenced. Phase 1 `screen.json` remains as **local mode** (`/tv?local=1`) for development and emergencies.
- **last_seen:** updated by `screen_bundle` at most once per 60 s → drives online/offline in admin (offline if > 3 min).

## 8. Data model

Full SQL: `11-schema.sql`. Tables: `platform_admins`, `profiles`, `organisations`, `members`, `invitations`, `org_settings`, `screens`, `pairing_codes`, `pair_attempts`, `media`, `slides`. Functions: `register_org`, `review_org`, `accept_invitations`, `pair_start`, `pair_status`, `pair_claim`, `screen_bundle`, plus RLS helpers. Nightly cleanup via `pg_cron`.

## 9. i18n

- Admin UI strings in `src/admin/i18n/ms.json` and `en.json`; no hard-coded UI text in components.
- Language stored in `profiles.lang` and `localStorage`; default `ms`.
- User-entered content (announcements) is never translated.
- Dates in admin formatted per language (`ms-MY` / `en-MY`); TV unchanged (BM).

## 10. Security & privacy

- RLS on every table; anon role can only execute the three TV functions.
- Pairing brute-force protection: codes expire in 10 min; `pair_claim` requires a signed-in Pentadbir of an **active** masjid and is limited to 10 failed attempts per user per hour; total active codes capped.
- Device secrets stored only as SHA-256 hashes.
- PDPA: privacy notice at `/privasi` (BM/EN) linked from sign-in; data held: AJK names/emails/phones, announcement content (incl. names of the deceased). Kematian auto-expire and purge; account deletion on request (manual in Phase 2).
- Emails: configure custom SMTP (e.g. Resend free tier) before pilot — Supabase's built-in sender is for testing only and heavily rate-limited.

## 11. Running cost (target RM0 beyond domain)

Supabase free (2 projects: `masjidview-dev`, `masjidview-prod`), Cloudflare Pages free, Resend free tier, Google OAuth free. Main risk = storage/egress from posters → mitigated by WebP compression, TV caching, and per-org usage shown on Platform page (sum of `media.bytes`). Re-check free-tier limits at setup. Free Supabase projects pause after inactivity; polling TVs keep prod active, dev may pause (restore from dashboard).

## 12. Acceptance criteria — Phase 2

1. Google sign-in and magic link both work on Android Chrome and iPhone Safari.
2. New registration appears in Platform → Menunggu; approve → registrant can access Utama; reject → sees reason.
3. User A (masjid A) cannot read or change any row or file of masjid B — verified by the automated RLS check script.
4. Pairing: TV shows code → claim on phone → TV shows display within 10 s; revoke → TV returns to pairing screen within 70 s.
5. Publishing/pausing/reordering a slide, or changing iqamah/theme/layout, appears on the TV within 70 s.
6. TV offline 48 h keeps showing last content and correct prayer times; reconnect → syncs.
7. Poster flow shows correct recommended sizes for the org's screens, fit labels, low-resolution warning; uploaded file ≤ 500 KB for a typical phone photo.
8. Live preview in the template editor matches the TV rendering for all 10 templates × 3 themes.
9. Kematian cannot be saved without an end date ≤ 7 days; purged 30 days after ending.
10. Admin fully usable in BM and English at 360 px width; every tap target ≥ 44 px.
11. Editor role cannot open Tetapan, Skrin actions or Ahli (UI hidden and DB rejects).
12. Zone picker: "Guna lokasi saya" at a known masjid returns the correct zone; denying location falls back to the lists; a multi-zone area forces a choice; the confirmation card shows today's times matching JAKIM e-Solat for that zone.

## 13. Later (not Phase 2)

Platform broadcast notice to all TVs · per-screen content targeting UI beyond "all/selected" · audit log · Ramadan mode · Jawi · WhatsApp notifications · wrapper APK · analytics.
