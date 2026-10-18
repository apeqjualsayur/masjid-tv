# Phase 1 Build — Claude Code Prompts

Run these **in order**, one per Claude Code session (or one after another in the same session). After each prompt, do the **Check** before moving on. If a check fails, paste the error back to Claude Code and ask it to fix before continuing.

**Before prompt 1:** create an empty folder `masjid-tv`, open it in VS Code, and copy this whole `_specs/` folder into it.

---

## Prompt 1 — Scaffold

```
Read every file in _specs/ (00-PRD.md, 01-theme-contract.md, and skim designs/).
Then scaffold the project:
- Next.js (App Router) + TypeScript + Tailwind, configured for static export (output: 'export').
- Folders: src/core (prayer engine, pure TS), src/data (API, cache, fallback), src/themes/{alam,serambi,tenang}, src/templates (template field schemas + sample data), src/app/tv (the display page), scripts/, public/config/, public/data/.
- Add Vitest for unit tests.
- Self-host these fonts with next/font/google so they work offline: Plus Jakarta Sans, Noto Naskh Arabic, Barlow, Barlow Condensed, Reem Kufi, Amiri, Manrope.
- Create public/config/screen.json exactly as in PRD §9.4.
- Create a CLAUDE.md at the root summarising: the stack, folder rules (no styling in src/core, no prayer logic in themes), and "always read _specs/ before changing behaviour".
Do not build any screens yet. Show me the folder tree when done.
```
**Check:** `npm run dev` starts; `npm test` runs (0 tests is fine); folder tree matches.

---

## Prompt 2 — Prayer engine (pure logic, fully tested)

```
Implement src/core per PRD §4 and §5:
1. time.ts — a single now() that applies a stored clock offset, plus debug overrides (sim start time + speed) from PRD §10.
2. schedule.ts — given a day's 7 times (+ tomorrow's imsak), compute for any instant: phase, current (prayers only, markers excluded, none between Syuruk and Zohor), next (markers included, wraps to tomorrow's imsak), countdown text in BM ("2 jam 51 minit", "49 minit"), isFriday (Zohor label "Jumaat").
3. modes.ts — the state machine: normal → pre_azan → azan → iqamah → solat → normal; Friday Zohor: azan → khutbah → solat. Durations from config. Return mode, target waktu, remaining seconds, progress 0..1. Markers never trigger modes.
4. format.ts — 12h without AM/PM ("1:05") or 24h; Malay Gregorian date ("Sabtu, 17 Oktober 2026"); Hijri from the API string "1448-05-06" → "6 Jamadilawal 1448H" (Malay month names).
Write Vitest tests covering every acceptance criterion in PRD §12 items 1–3 and 6, plus edge cases: just after midnight, exactly at a boundary second, Isyak→Imsak wrap, Friday.
```
**Check:** `npm test` all green. Ask Claude Code to show you the test list in plain words.

---

## Prompt 3 — Data layer + offline

```
Implement src/data per PRD §9:
1. api.ts — fetch https://api.waktusolat.app/v2/solat/{zone}?year=&month= . Verify on the first real response that times are Unix epoch seconds; if not, adapt and log clearly. Also fetch /chrono and compute the clock offset (store it).
2. cache.ts — IndexedDB store keyed zone:YYYY-MM; fetch current + next month on boot and daily at 00:10; re-sync /chrono every 30 min.
3. fallback — scripts/fetch-year.ts that downloads 12 months for a zone into public/data/{zone}-{year}.json. Run it for SGR01 for 2026 and 2027.
4. Read order: IndexedDB → bundled fallback → explicit "Data waktu tidak tersedia" state. Never show guessed times.
5. zones: find the correct zones endpoint (try /zones), save a copy to src/data/zones.json.
Add tests with mocked fetch for: online, offline with cache, offline without cache (fallback), and corrupted cache.
```
**Check:** tests green; `public/data/SGR01-2026.json` exists and today's Zohor matches the JAKIM e-Solat website.

---

## Prompt 4 — Display page + stage + simulator

```
Build src/app/tv/page.tsx:
- Load screen.json, apply URL overrides (theme, layout, mode, sim, speed, day, lite, debug) per PRD §10.
- Build the DisplayState object exactly as in 01-theme-contract.md §1, updating every second.
- A 1920×1080 "stage" that scales to fit any screen (letterbox non-16:9), shifts 0–4 px every 10 minutes (burn-in), auto-reloads at 03:00, and has an error boundary that reloads after 30 s.
- Lite mode: ?lite=1, or automatic if average frame time > 50 ms over 10 s.
- For now render a plain debug view (no theme) that prints the DisplayState as large text so we can verify logic.
```
**Check:** open `/tv?sim=2026-10-17T13:03:30&speed=20&debug=1` and watch it go pre_azan → azan → iqamah → solat → normal. Then try `&day=fri`.

---

## Prompt 5 — Theme system + Tenang (simplest theme first)

```
Implement the ThemeDefinition interface and a theme registry, then build the "tenang" theme per 01-theme-contract.md §5.
Use designs/F-Full.dc.html, F-Bottom.dc.html, F-Side.dc.html, F-Iqamah.dc.html as the visual reference: match layout, sizes, colours and weights (use the UPDATED weights in the contract, not older values).
Implement: layouts full/bottom/side, screens preAzanBanner/azan/iqamah/solat/khutbah, posterFrame (uncropped + blurred fill), and templates pengumuman + kewangan from the references. For the other 8 templates create simple versions that follow the theme tokens (Kematian: no accent colours).
Replace the debug view with the selected theme. Respect showArabic and lite.
```
**Check:** `/tv?theme=tenang&layout=full&debug=1` at 1920×1080 in Chrome — compare side by side with the F-Full mockup. Repeat for bottom, side, `mode=iqamah`. Change `sim` to each phase and confirm pastel colours change.

---

## Prompt 6 — Serambi

```
Build the "serambi" theme per 01-theme-contract.md §4, matching designs/D-*.dc.html.
Arches: explicit px radius, sky per waktu (not per phase), current arch taller with gold ring and glow, past arches at 0.42 opacity. Ambient glow follows the current arch.
Templates program and ayat from the references; the other 8 follow the theme tokens.
Iqamah: single large arch filling with gold light from the bottom by progress.
In lite mode remove glows and the ambient radial.
```
**Check:** compare `/tv?theme=serambi` (all layouts + iqamah) with D-* mockups; step `sim` through the day and watch the highlight move along the arches.

---

## Prompt 7 — Alam

```
Build the "alam" theme per 01-theme-contract.md §3, matching designs/A-*.dc.html (A-Full = Main, A-Bottom, A-Side, A-Iqamah).
Landscape as one inline SVG (sky gradient div + sun/moon with radial glow + stars + 3 mountain layers + mosque silhouette), all colours from the per-phase token table. Cross-fade the palette over 60 s when the phase changes.
Glass cards use backdrop-filter; in lite mode replace with solid rgba(8,18,28,0.55).
Template kuliah from A-Bottom; the other 9 follow the theme tokens.
```
**Check:** compare with A-* mockups; switch phases; test `&lite=1` looks acceptable.

---

## Prompt 8 — Slides playlist (Phase 1, from JSON)

```
Create public/config/sample-slides.json with one example of each of the 10 templates (fields per PRD §7, placeholder text in brackets) and two poster images (any portrait + landscape sample in public/config/).
Add a playlist engine: rotates slides in the poster area of bottom/side layouts, per-slide duration (default 15 s), skips expired slides (ends_at), respects days_of_week, priority items shown twice as often. Smooth cross-fade 600 ms (none in lite mode).
Add a small "2 / 6" counter.
```
**Check:** `/tv?theme=serambi&layout=side` cycles through all 10 templates + posters; every template renders in all 3 themes.

---

## Prompt 9 — PWA + offline hardening

```
Add a hand-written service worker: precache the app shell, fonts, config, bundled prayer data; runtime cache posters (cache-first) and API (network-first, fall back to cache). Add a web manifest (display: fullscreen, landscape).
Add a hidden status overlay (toggle with ?debug=1): data source in use (live/cache/fallback), last data sync, last clock sync, clock offset, lite on/off, app version.
Write a test plan in _specs/03-test-plan.md covering PRD §12 and run what can be automated.
```
**Check:** in Chrome DevTools → Network → Offline, reload — screen still works. Status overlay shows "cache" or "fallback".

---

## Prompt 10 — Deploy

```
Prepare deployment to Cloudflare Pages (static export). Give me step-by-step instructions written for a non-coder: create the Cloudflare account/project, connect the GitHub repo, build command, output folder, and how each push creates a preview URL. Also add a GitHub Action that runs tests on every push.
```
**Check:** the Cloudflare preview URL opens `/tv` on your laptop.

---

## Prompt 11 — Pilot device setup guide

```
Write _specs/04-pilot-setup.md: a printable step-by-step guide for an AJK member to set up (a) a Google TV with Fully Kiosk Browser (sideload via Downloader, start URL, autostart on boot, disable screensaver/ambient mode/auto sleep, daily reload, remote admin password) and (b) a laptop in Chrome kiosk mode on Windows (shortcut with --kiosk, power settings, disable notifications, autostart). Use plain BM-friendly English, numbered steps, and a troubleshooting table.
```
**Check:** follow the guide yourself on the laptop first, then on the pilot Google TV.

---

## After Phase 1

Run the 7-day unattended test (PRD §12 item 8), collect issues, then start Phase 2 (admin panel + Supabase) with a new spec.
