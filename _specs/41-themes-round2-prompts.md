# Masjid View — Themes round 2 + Announcement-only screen: step-by-step prompts (T0–T12)

Adds 4 themes (Falak, Garis Masa, Kerawang, Seterusnya) and a new screen type, **Pengumuman sahaja**, for a second TV.
Spec: `_specs/40-PRD-themes-round2.md` · SQL: `_specs/42-themes-round2-migration.sql` · Designs: `designs/G-*`, `I-*`, `J-*`, `K-*`.

**How to use:** open the `masjid-tv` folder in VS Code → Terminal → `claude`. Paste **one prompt at a time**. Do its **Check**, then commit (`git add -A && git commit -m "T3 done"`). Start each prompt in a fresh conversation (`/clear`) so it re-reads the specs. If Claude Code shows a plan or asks a question, answer before it continues. If a check fails, paste the error back and ask for a fix.

Everything runs on **masjidview-dev** until T12.

| Step | Who | What |
|---|---|---|
| T0 | You | Copy designs + specs, create a branch |
| T1 | Claude | Read designs, draft contract v0.3 (you approve) |
| T2 | Claude | Engine: iqamah time, `poster` layout key, theme registry, safe fallback |
| T3 | Claude | Announcement-only screen for Alam/Serambi/Tenang + 16:9 templates |
| T4 | Claude | Theme Falak |
| T5 | Claude | Theme Garis Masa |
| T6 | Claude | Theme Kerawang |
| T7 | Claude | Theme Seterusnya |
| T8 | Claude | Database migration (dev) |
| T9 | Claude | Admin: 7 themes, 4 layouts, poster size, targeting hints |
| T10 | Claude | Landing page + "Cuba sekarang" |
| T11 | You | Test on real TVs (two-TV test) |
| T12 | Claude + you | Production rollout |

---

## T0 — You: preparation (about 15 minutes)

1. Copy the zip I gave you (`masjidview-themes-round2-designs.zip`): the 16 files go into `masjid-tv/designs/` (names: `G-Full.dc.html` … `K-Iqamah.dc.html`).
2. Copy `40-PRD-themes-round2.md`, `41-themes-round2-prompts.md`, `42-themes-round2-migration.sql` into `masjid-tv/_specs/` (they are in the Project).
3. Terminal: `git checkout -b themes-round2` then `git add -A && git commit -m "specs+designs: themes round 2"`.
4. Open the canvas (Konsep G H I J K L M N O) once more and write down, for G, I, J, K, anything you want changed before coding (colours, sizes, wording). Changing a design now costs minutes; after T4–T7 it costs a prompt each.
5. Ask someone who knows Malay carving to look at Kerawang's motifs (rows J in the canvas) before launch. Not blocking; do it while T1–T5 run.

---

## T1 — Audit and contract v0.3 (no code)

```
Read the project rules file (CLAUDE.md or AGENTS.md), then _specs/40-PRD-themes-round2.md, _specs/01-theme-contract.md and all 16 new design files: designs/G-*.dc.html, I-*, J-*, K-*. Do NOT change code in this step.
1. For each new theme (falak, garis, kerawang, seterusnya) extract from the markup and script blocks: font families and weights, per-phase colours/tokens, sizes, and special rules. The mockups are 1280×720; convert every px value ×1.5 for the 1920×1080 stage (PRD D4).
2. List every value that breaks a contract rule after scaling (smallest text 18 px, times ≥ 54 px Full/Side and ≥ 44 px Bottom, past opacity ≥ 0.42, poster areas 12:5 and 5:4). For each, propose the fix.
3. Draft contract v0.3 as a diff for _specs/01-theme-contract.md: update §1 (LayoutKey 'poster', ThemeDefinition id union, posterArea, templates `area` prop, WaktuView.iqamah), add rules 14–18 from PRD §3, and add sections for the 4 themes in the same format as §3–§5 (token tables, fixed tokens, sizes, references). Show me the diff and wait for my OK before saving it. Also propose the matching AGENTS.md edits (layouts list, debug params: theme=falak|garis|kerawang|seterusnya, layout=poster).
4. Tell me which fonts each new theme needs, how many font files that adds, and any font that is not on Google Fonts.
5. Report anything in the PRD that contradicts the contract or the code (stop and ask, do not guess).
```
**Check:** you get a diff with 4 theme sections and a short list of rule violations with fixes. Read the token tables once against the canvas (colours per phase look right?). Reply "OK, save". Commit.

---

## T2 — Engine: iqamah time, `poster` layout key, registry, fallback

```
Implement PRD §2 (D2, D3, D5, D7, D8) and §3 contract changes in non-styling code only.
1. src/core: add WaktuView.iqamah (azan time + iqamahMin[waktu], formatted like `time`; undefined for imsak, syuruk, and Friday Zohor). Add LayoutKey 'poster'. When layout is 'poster', the display state must NOT switch to pre_azan/azan/iqamah/solat/khutbah modes for rendering (keep computing phase). Vitest: iqamah for each waktu, Friday Zohor, iqamahMin changes, 24h clock; poster layout ignores modes at azan/iqamah/khutbah times.
2. Theme registry in src/themes/index.ts: map id → dynamic import. Selected theme is loaded lazily; show the previous theme (or tenang) while loading. If loading fails (offline), keep the old theme and retry later; never blank.
3. src/data/bundle.ts: validate theme in [alam, serambi, tenang, falak, garis, kerawang, seterusnya] and layout in [full, bottom, side, poster]; anything else → 'tenang' / 'full'. Tests for unknown values.
4. Debug params (?debug=1): theme accepts the 4 new ids, layout accepts poster.
5. Service worker: precache assets of the selected theme only; when the theme changes, fetch the new theme's chunks and fonts first, then switch. Keep font self-hosting via next/font/google (must work offline).
6. For now register the 4 new ids pointing to a minimal placeholder theme (the tenang theme re-exported) so everything compiles. Do not touch admin or the database.
Run npm test and npm run build and paste the summary lines.
```
**Check:** `npm test` passes. `/tv?theme=falak&debug=1` shows the Tenang look (placeholder) without errors; `/tv?theme=banana&debug=1` also falls back to Tenang. `/tv?layout=poster&debug=1` still renders (placeholder).

---

## T3 — Announcement-only screen for Alam, Serambi, Tenang + 16:9 templates

```
Read _specs/40-PRD-themes-round2.md §4 and contract rules 14–18.
1. For each existing theme (tenang, serambi, alam) add layouts.poster per rules 14–17: slide edge-to-edge in 1920×1080, small brand chip bottom-left, no clock/date/prayer/ticker/counter/Friday strip/modes. Add posterArea.poster = {x:0,y:0,w:1920,h:1080}. Image posters: contain + blurred fill. Empty state per rule 17.
2. Add the `area` prop ('bottom'|'side'|'poster') to all 10 template components of all 3 themes and make each adapt to a 16:9 area as well as 12:5 and 5:4 (larger type and more generous spacing at 16:9, no clipped text, no text below 18 px). Kematian stays sober in every area.
3. /tv page: when the screen layout is poster, render only the poster layout. Playlist as in PRD §4 (priority ×2, cross-fade, single slide = no transition, counter hidden). Honour lite mode.
4. Vitest where there is logic (playlist single slide, empty state). Playwright screenshots at 1920×1080 into designs/qa/poster/ (git-ignored): 3 themes × 10 templates (sample data) + 3 themes empty state + one with an image poster at 16:9 and one portrait. Do NOT run playwright install.
Run npm test and npm run build.
```
**Check:** open `/tv?theme=serambi&layout=poster&sim=2026-10-23T13:05:00&debug=1` (azan time on a Friday): you still see slides only, no clock, no azan screen. Look through the 33 screenshots: any clipped text? Does Kematian look sober in all three?

---

## T4 — Theme Falak (G, analogue clock)

```
Build the "falak" theme per _specs/01-theme-contract.md (Falak section) and PRD §5, matching designs/G-*.dc.html (G-Full = Main, G-Bottom, G-Side, G-Iqamah). Replace the placeholder registration.
Implement: layouts full/bottom/side/poster, screens preAzanBanner/azan/iqamah/solat/khutbah, fridayInfo, posterFrame, posterArea, and all 10 templates (area prop; kuliah, program, ayat, pengumuman, kewangan from the closest existing theme template adapted to Falak tokens; Kematian sober). Respect showArabic and lite.
Specific: dial in SVG with explicit elements; only waktu in the next 12 hours are marked; light face for zohor/asar, dark for subuh/maghrib/isyak (PRD D6); hands update once a second; digital time in the small window below the pivot; rim arc = progress to next waktu; in lite remove glows and transitions.
Playwright screenshots at 1920×1080 into designs/qa/falak/: 5 phases × 4 layouts, the 5 mode screens, Friday strip, Kematian, showArabic off, lite=1. Do NOT run playwright install.
Run npm test and npm run build.
```
**Check:** compare `/tv?theme=falak&layout=full&debug=1` with the canvas mockup. Step `sim` through 06:00, 13:30, 16:50, 19:30, 21:00: face and colours change, hands are correct (e.g. 13:20 → hour hand just past 1). Check the ambiguity case: `sim=2026-10-17T19:10:00` (Maghrib is close to Syuruk on the 12-h dial) – no overlapping labels.

---

## T5 — Theme Garis Masa (I, timeline)

```
Build the "garis" theme per the contract (Garis Masa section) and PRD §5, matching designs/I-*.dc.html. Replace the placeholder registration.
Same deliverable list as T4 (layouts incl. poster, screens, fridayInfo, posterFrame, posterArea, 10 templates with area prop, showArabic, lite, Kematian sober).
Specific: window Imsak → Isyak + 72 min; segment widths proportional to real duration; Syuruk–Zohor is one neutral segment labelled "Syuruk"; Imsak as a small note; past segments opacity 0.42 minimum; label collision rule (stagger when closer than 140 px); before Imsak/after window clamp the now-marker; Friday: Zohor label "Jumaat"; side layout uses the vertical timeline; Iqamah = 10 draining minute blocks with big mm:ss. Unit-test the pure geometry (segment positions, label stagger, clamping) in src/themes/garis/geometry.ts.
Screenshots into designs/qa/garis/ as in T4. Run npm test and npm run build.
```
**Check:** compare with the canvas. Try a Ramadan-like day by changing the zone to one with different times (e.g. `&zone=` if supported, otherwise edit `public/data` sample) – no overlapping labels. `sim=2026-10-17T03:00:00` (before Imsak): marker sits at the end, nothing breaks.

---

## T6 — Theme Kerawang (J, Malay carved woodwork)

```
Build the "kerawang" theme per the contract (Kerawang section) and PRD §5, matching designs/J-*.dc.html. Replace the placeholder registration.
Same deliverable list as T4.
Specific: carved patterns drawn once as SVG patterns (never regenerated per tick); arch-topped panels in timber; current panel gold-lit, others dim (past ≥ 0.42); timber grain as a cheap CSS gradient (remove in lite along with glow); Iqamah = pierced arch lit from the bottom by progress; Kematian: plain dark panel, NO pattern, NO gold. Add a comment in the pattern file: "Simplified motifs - needs review by a Malay carving expert".
Check text contrast (WCAG AA for body text) on every phase background and fix any failing colour pair.
Screenshots into designs/qa/kerawang/ as in T4. Run npm test and npm run build.
```
**Check:** compare with the canvas; open Kematian in Kerawang and confirm it has no decoration; `&lite=1` still looks good; Chrome Performance on `/tv?theme=kerawang`: no long tasks while the clock ticks.

---

## T7 — Theme Seterusnya (K, next prayer first with azan + iqamah)

```
Build the "seterusnya" theme per the contract (Seterusnya section) and PRD §5 and D5, matching designs/K-*.dc.html. Replace the placeholder registration.
Same deliverable list as T4.
Specific: hero for the next waktu with azan time, iqamah time (WaktuView.iqamah) and the countdown ring; the list/strip/bar/side show azan and iqamah columns for all 7 waktu; the current waktu stays clearly distinct from the next one (fill + weight, not colour alone); no iqamah shown for Imsak, Syuruk and Friday Zohor (Jumaat: azan + khutbah start); ring updates once a second in Full only; Iqamah screen per K-Iqamah.
Screenshots into designs/qa/seterusnya/ as in T4. Run npm test and npm run build.
```
**Check:** change an iqamah value in `public/config/screen.json` (e.g. Asar 10 → 12) and reload: the iqamah column moves by 2 minutes. Friday sim: `sim=2026-10-23T11:00:00` → Jumaat row has no iqamah.

---

## T8 — Database migration (dev)

```
Read _specs/42-themes-round2-migration.sql and _specs/40-PRD-themes-round2.md §7.
1. Copy the file to supabase/migrations/ as the next number and explain it in plain words.
2. Extend scripts/rls-check.ts (same PASS/FAIL style): pair_claim accepts each new theme and layout poster; an invalid theme is rejected; screen_bundle returns the new theme/layout strings; slides with screen_ids targeting a poster screen are not returned to a full screen's bundle, and are returned to the poster screen; cleanup at the end even on failure.
3. Tell me step by step how to apply it to masjidview-dev only (ask whether I prefer SQL editor or `supabase db push`), then run `npm run rls-check`.
Do not touch masjidview-prod.
```
**Check (dev SQL editor):** `select enum_range(null::public.theme_key);` lists 7 values; `select enum_range(null::public.layout_key);` lists 4; `npm run rls-check` all PASS.

---

## T9 — Admin: choose theme and layout, poster size, targeting hints

```
Implement PRD §6 on the admin app, mobile-first (390 px) and computer (≥ 1024 px), using existing components and tokens.
1. Skrin page and "Tambah skrin" sheet: theme choice now 7 (Alam, Serambi, Tenang, Falak, Garis Masa, Kerawang, Seterusnya) with thumbnails that are real theme renders mounted only when visible (IntersectionObserver, clock frozen) and lazy-loaded; layout choice now 4, the new one named "Pengumuman sahaja" with helper text "Untuk TV kedua. Tiada jam atau waktu solat." Edit-screen uses the same controls. Mini preview of a poster screen shows the slide-only look.
2. When the masjid has exactly one screen, the add-screen sheet suggests "Pengumuman sahaja" for the second TV (dismissible, remembered per browser).
3. Poster upload page: recommended sizes list gets poster layout 1920×1080 (16:9); fit labels and the low-resolution warning use the 16:9 area.
4. Template editor and schedule component: live preview selector includes the poster layout; target screens control shows each screen's layout; warn "Skrin ini tidak memaparkan pengumuman." if the chosen targets are only 'full' screens.
5. Feature switch: a constant THEMES_ROUND2_VISIBLE in src/config (default false) hides the 4 new themes and the poster layout in the admin; set it to true in this dev build only via NEXT_PUBLIC_THEMES_ROUND2=1 in .env.local.
6. ms.json / en.json for every new string; unit tests for the warning logic. Run npm test and npm run build.
```
**Check (local with `NEXT_PUBLIC_THEMES_ROUND2=1`, dev data):** add a screen with theme Falak and layout Pengumuman sahaja; the TV (`/tv` paired to dev) switches within ~70 s. Phone width: no sideways scroll; keyboard Tab reaches every new option. Set the variable to 0 → the old 3 themes and 3 layouts only.

---

## T10 — Landing page and "Cuba sekarang"

```
Update the landing page (specs/20-PRD-landing.md, section numbers 3, 11, 9) for 7 themes and the new screen type.
1. Numbers band: "7 tema". Section 11 Tema: show all 7 themes (real renders, mounted only when in view, clock frozen, fixed sim times).
2. Section 9 Cuba sekarang: 7 theme buttons (wrap on phone, aria-pressed), still local-only.
3. Add one feature card to Ciri-ciri: "Dua TV, dua tugas" – prayer times on one TV, announcements on the other (use the real poster layout render).
4. Update FAQ answer about number of screens/themes if it mentions 3 themes. Update JSON-LD text if needed. Keep BM/EN strings in i18n.
Run npm test and npm run build; Lighthouse performance must not drop more than 5 points.
```
**Check:** scroll the page at 1440 and 390; Network tab: only the visible themes' code loads; type a name in Cuba sekarang and switch through the 7 themes.

---

## T11 — You: test on the real TVs (about 1 hour)

Use the dev project and your pilot Google TV + laptop as the second "TV".
1. **Two-TV test:** pair TV 1 (layout Bottom or Full) and the laptop `/tv` (layout Pengumuman sahaja) to the same dev masjid. Publish two slides: one for "Semua skrin", one targeted only to the laptop. TV 1 shows only the first; the laptop shows both and never a clock.
2. **Azan test:** on TV 1 open `?sim=…` to a few minutes before Asar azan: TV 1 goes to azan/iqamah screens; the laptop keeps showing slides.
3. **Each new theme on the pilot TV from the sofa distance (5 m):** can you read the time, the current prayer and the next prayer? Try each layout. If a text is hard to read, ask Claude: "Make <element> 20% larger in <theme>, keep the poster size."
4. **lite=1 on the TV:** smooth? If a theme stutters, note which and ask Claude to simplify it in lite.
5. **Offline:** turn WiFi off for 10 minutes on TV 1 with a new theme → keeps running; change theme in admin while offline, turn WiFi on → switches within ~70 s.
6. **24 h soak:** leave the pilot TV on the heaviest theme (Kerawang or Falak) overnight; next morning it is still running and the debug overlay shows no errors.

---

## T12 — Production rollout

```
Prepare the production rollout of themes round 2. Do not run anything against masjidview-prod yourself. Give me a numbered checklist with copy-paste commands and SQL, following PRD D9:
1. Backup masjidview-prod (supabase db dump to a folder outside the repo).
2. Apply the themes migration to prod (same method as dev) and verify with the two enum_range queries.
3. Merge branch themes-round2 into main with THEMES_ROUND2_VISIBLE = false (admin still shows 3 themes and 3 layouts), push, and how to confirm the Cloudflare Pages deploy finished and which app_version string the TVs will report.
4. A SQL query on prod that lists screens whose app_version is not the new version and whose last_seen_at is within 24 h; do not continue until it returns nothing, or the stragglers are known to be offline.
5. Flip the switch to true (one-line commit), push, and confirm in admin that the 7 themes and 4 layouts appear.
6. Smoke test on prod: change my own pilot screen to Falak, then to Pengumuman sahaja, then back.
7. Rollback: switch the flag to false; SQL to move any screens back to tenang/full; note that enum values stay (harmless).
```
**Check (prod):** the pilot screen switches themes within ~70 s; `select theme, layout, count(*) from screens group by 1,2;` shows only expected values; no screen has a stale `app_version` after 24 h.

---

## Notes

- **Kerawang motifs** need review by someone who knows Malay carving before you promote the theme.
- **Seterusnya** uses the iqamah minutes each masjid already sets in Tetapan, so no new setting is needed.
- A future "pause announcements during azan" or "show azan screen on the announcement TV" option would be a new setting; not in this round.
- Not launched (mockups only): Potret, Khat, Pita, Lengkung, Songket. They stay on the canvas for a later round.
