# Masjid View — Phase 2 test plan

Maps every acceptance criterion in `10-PRD-phase2.md` §12 to a check. **A** = automated (command below), **M** = manual (steps below), **A+M** = automated core plus a short manual check on real devices.

## Automated suites

| Suite | Command | What it covers | Last run |
|---|---|---|---|
| Unit tests | `npm test` | engine, themes, templates, admin logic, TV sync/pairing logic, i18n | 2026-10-23: **all passed** (see run log at the end) |
| RLS / database check | `npm run rls-check` | throwaway users A, B, C, D and platform owner P against **masjidview-dev**; cleans up after itself | 2026-10-23: **94 passed, 0 failed** |
| Browser checks (Phase 1, PRD 12.x) | `npm run e2e` | TV in real Chrome: modes, Friday, offline 48 h, clock offset, 3 themes × 3 layouts | 2026-10-23: see run log |
| Type check + build | `npm run lint && npm run build` | whole app compiles; static export + service worker | 2026-10-23: see run log |

`rls-check` needs `.env.local` with the dev URL, the anon key and the service-role key (local only, never committed). GitHub Actions runs unit tests + build on every push and the browser checks on `main` (`.github/workflows/test.yml`).

## Criteria

| # | Criterion (short) | Type | Check |
|---|---|---|---|
| 1 | Google + magic link sign-in on Android Chrome and iPhone Safari | **M** | M1 |
| 2 | Registration → Platform Menunggu; approve → Utama; reject → reason | **A+M** | A: rls-check "A registers org A", "P approves org A", "A cannot slide while pending", "P rejects org B", "B registers again"; `routing.test.ts` (pending → Menunggu, active → Utama). M: M2 |
| 3 | User A can't read/change any row or file of masjid B | **A** | rls-check: every "A cannot … org B" line (organisations, slides, settings, screens, media, members, invitations, storage upload/list, set_org_logo, reorder_slides) and the service-role "unchanged" checks |
| 4 | Pair within 10 s; revoke → pairing screen within 70 s | **A+M** | A: rls-check pair_start/pair_claim/pair_status, "after revoke → revoked"; `pairing/runner.test.ts` (pair_status every 5 s); `bundle.test.ts` ("revoked: wipes the stored bundle and stops polling"; sync every 60 s). M: M3 (timed on a real TV) |
| 5 | Publish/pause/reorder slide, iqamah/theme/layout change → TV within 70 s | **A+M** | A: rls-check "after the iqamah change the version increases", "saving durations bumps bundle_version", "bundle carries…"; `bundle.test.ts` (unchanged/ok flow, schedule rules); `data/slides.test.ts`. M: M4 |
| 6 | 48 h offline keeps content + correct times; reconnect syncs | **A** | e2e 12.5 (offline from service worker + cache, +48 h, fallback, never guessed); `offline.test.ts`; `bundle.test.ts` ("offline boot: shows the stored bundle…"). Optional M5 on a real TV |
| 7 | Poster: recommended sizes, fit labels, low-res warning; ≤ 500 KB typical photo | **A+M** | A: `poster/logic.test.ts` (bands ≥85 / 50–85 / <50 %, upscale > 1.4× per layout, recommended sizes per screen, long edge ≤ 1920). M: M6 (real phone photo → file size shown "x MB → y KB" ≤ 500 KB) |
| 8 | Template live preview = TV rendering, 10 templates × 3 themes | **A+M** | A: `themes.test.tsx` "renders in" for every template × layout, `alam/serambi.test.tsx`; the editor preview mounts the same theme components (`src/admin/editor`). M: M7 (side-by-side visual check) |
| 9 | Kematian needs end date ≤ 7 days; purged 30 days after ending | **A+M** | A: rls-check "kematian with ends_at more than 7 days ahead is rejected", "without ends_at is rejected", "ending in 3 days is accepted"; `templates/schema.test.ts` (7-day rule). M: M8 (pg_cron job exists — `16-production-setup.md` Part C) |
| 10 | BM + EN at 360 px, taps ≥ 44 px; computer 1280×800 and 1920×1080 in Chrome, Edge, Safari | **A+M** | A: `i18n.test.ts` (same keys in BM/EN, no empty strings, no hard-coded UI text). M: M9 |
| 11 | ≤ 2 admins (also simultaneous accepts); 1 masjid per e-mail; invite rules; last admin; transfer_org owner-only | **A** | rls-check: "already_has_org", "user_has_org", "invite_pending", "org_full" (invite and transfer_org), "accept_invitations", "last_pentadbir", "A calls transfer_org → not_allowed", "P replaces A by C". Simultaneous accepts: enforced by the `members_max_two` trigger, which locks the organisation row (`for update`) before counting; not load-tested |
| 12 | Zone picker: GPS at a known masjid; deny → lists; multi-zone forces a choice; card times = e-Solat | **A+M** | A: `ZonePicker/gps.test.ts` (fallback on denied/timeout/offline), `ZonePicker/logic.test.ts` ("real multi-zone areas need a choice", "every zone is reachable"). M: M10 |

## Manual checks

Use a throwaway account and a test masjid on **dev** (or prod before the pilot), and delete them afterwards.

- **M1 Sign-in (phones).** On an Android phone (Chrome) and an iPhone (Safari): (a) **Teruskan dengan Google** → lands on Daftar/Utama/Platform; (b) sign out, enter an e-mail → **Hantar pautan** → open the e-mail on the same phone → signed in. Pass: both work on both phones. On prod, the e-mail comes from `noreply@masjidview.my`.
- **M2 Registration.** New account → Daftar (both steps) → Menunggu. Platform owner: Platform → Refresh → Pending (1) → Lulus. Registrant refreshes → Utama. Repeat with **Tolak** + a reason → registrant sees the reason and **Daftar semula**.
- **M3 Pairing timing.** TV: open `/tv/` → code. Phone: Skrin → Tambah skrin → code → stopwatch: TV shows the masjid in **≤ 10 s**. Then Skrin → Buang/Revoke → stopwatch: TV shows the pairing code in **≤ 70 s**.
- **M4 Changes reach the TV.** With a paired TV, one at a time, stopwatch ≤ 70 s each: publish a slide, pause it, reorder two slides, change Zohor iqamah, change the screen's theme, change its layout.
- **M5 Offline (optional, real TV).** Unplug the router for 1 hour: the TV keeps the content and the right times; reconnect: a change made meanwhile appears within 70 s.
- **M6 Poster.** Phone camera photo (3–5 MB) → Poster: recommended sizes shown for each screen, fit labels, the "x MB → y KB" line ≤ 500 KB. A small 640×800 picture shows the low-resolution warning.
- **M7 Preview = TV.** For 2 templates per theme (incl. Kematian and one with images): editor preview vs the TV (same layout) side by side. Pass: same text, same placement.
- **M8 Purge job.** SQL Editor: `select jobname, schedule from cron.job;` → `masjidview-cleanup`.
- **M9 Responsive.** Phone at 360 px (Chrome device toolbar is fine) in BM and EN: no cut-off text, every button easy to tap. Computer at 1280×800 and 1920×1080 in Chrome, Edge and Safari: sidebar, Kandungan table, editor side-by-side preview, poster drag-and-drop.
- **M10 Zone picker.** At a known masjid: **Guna lokasi saya** → the right zone. Deny location → lists still work. Pick an area in two zones → a choice is required. Compare the card's times with JAKIM e-Solat for that zone.

## Run log — 2026-10-23
| Suite | Result |
|---|---|
| `npm run lint` (type check) | passed |
| `npm test` | 44 files, **510 tests passed** |
| `npm run rls-check` (dev) | **94 passed, 0 failed**; throwaway users and orgs removed |
| `npm run build` | passed; service worker precaches 174 files |
| `npm run e2e` | **7/7 passed** (12.1 to 12.7) |

Manual checks M1 to M10: not run yet. Do them on prod before the pilot, and note here the date and the phone or TV used.
