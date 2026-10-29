# Masjid View — Themes round 2 + Announcement-only screen (PRD v0.1)

Adds 4 themes and 1 new screen type. Builds on `00-PRD.md`, `01-theme-contract.md` (v0.2), `10-PRD-phase2.md`, `11-schema.sql`.
Design source: `designs/G-*`, `designs/I-*`, `designs/J-*`, `designs/K-*` (each theme = Full, Bottom, Side, Iqamah). If this file and the contract disagree, STOP and ask.

---

## 1. Scope

| # | Item | Theme id | Name in admin | Design files |
|---|---|---|---|---|
| 1 | Analogue clock | `falak` | Falak | `G-Full`, `G-Bottom`, `G-Side`, `G-Iqamah` (canvas names: Main, Falak-*) |
| 2 | Day as a proportional timeline | `garis` | Garis Masa | `I-*` (canvas: Garis-*) |
| 3 | Malay carved-woodwork panels | `kerawang` | Kerawang | `J-*` (canvas: Kerawang-*) |
| 4 | Next prayer first, azan + iqamah | `seterusnya` | Seterusnya | `K-*` (canvas: Seterusnya-*) |
| 5 | **Announcement-only screen** (layout `poster`) for every theme, old and new | — | Pengumuman sahaja | no mockup; rules in §4 |

Not in scope: Potret (H), Khat (L), Pita (M), Lengkung (N), Songket (O) — mockups exist but are not launched.

## 2. Decisions (fixed)

| ID | Decision |
|---|---|
| D1 | Theme ids added to the DB enum: `falak`, `garis`, `kerawang`, `seterusnya`. Layout id added: `poster`. |
| D2 | **Announcement-only screens ignore prayer modes.** `pre_azan`, `azan`, `iqamah`, `solat`, `khutbah` never replace the slides on a `poster` screen. (A masjid with two TVs wants the second one to stay on announcements.) Any later "pause during azan" option is a new setting, not now. |
| D3 | The `poster` layout still computes the prayer **phase** internally, only to tint theme colours (Subuh … Isyak). It never shows a time, name or countdown. |
| D4 | Mockups for the 4 new themes are **1280×720**. The stage is 1920×1080. Scale every px value by **1.5**, then enforce the minimums in the contract (smallest text 18 px, times ≥ 54 px in Full/Side and ≥ 44 px in Bottom). If scaling breaks a minimum, increase the size; do not delete the element. **Bottom layout:** poster 1824×760 (12:5) at 48,24 in every theme, prayer bar below; the G/I/J/K-Bottom split layouts are not used, so one poster size fits all themes (owner decision 2026-10-29). |
| D5 | Seterusnya shows **iqamah time = azan time + the masjid's existing `iqamahMin[waktu]`**. No new setting and no database change. No iqamah for Imsak, Syuruk, or Friday Zohor (Jumaat: show khutbah start from `friday` instead). |
| D6 | Falak face (light/dark) is automatic by phase: **light** = zohor, asar; **dark** = subuh, maghrib, isyak. Not a masjid setting. |
| D7 | Unknown `theme` or `layout` value from a bundle (e.g. an old TV app receiving a newer id) must **fall back to `tenang` / `full`**, never crash or blank. |
| D8 | Theme **code** is lazy-loaded per theme (only the selected theme is loaded). All fonts and theme chunks stay precached by the service worker (offline-safe), so a theme change never fails for missing files; if loading still fails, the TV keeps the old theme and retries (owner decision 2026-10-29). |
| D9 | Rollout order: DB migration → deploy TV/admin code with the new options **hidden** → wait until every TV's `screens.app_version` is the new version → show the options in admin. |

## 3. Contract changes (to be merged into `01-theme-contract.md` as v0.3)

```ts
export type LayoutKey = 'full' | 'bottom' | 'side' | 'poster';

export interface WaktuView {
  // …existing fields…
  iqamah?: string;          // "1:15" formatted like `time`. Undefined for markers and Friday Zohor.
}

export interface ThemeDefinition {
  id: 'alam' | 'serambi' | 'tenang' | 'falak' | 'garis' | 'kerawang' | 'seterusnya';
  layouts: Record<LayoutKey, React.FC<{ s: DisplayState; slide?: SlideView }>>;   // poster added
  posterArea: Record<'bottom' | 'side' | 'poster', { x: number; y: number; w: number; h: number }>; // poster = 0,0,1920,1080
  templates: Record<TemplateKey, React.FC<{ s: DisplayState; fields: any; area: 'bottom' | 'side' | 'poster' }>>; // `area` is new
  // everything else unchanged
}
```

New contract rules (14–18) — applies to **every** theme:

14. **`poster` layout** renders the current slide edge-to-edge in the 1920×1080 stage (area ratio **16:9**). The only chrome is a small **brand chip** (logo + short name, text ≥ 18 px, bottom-left, 48 px safe margin, theme colours, 70 % opacity). No frame, border or decoration around the slide beyond what the theme's `posterFrame` / template already draws.
15. **`poster` layout never shows**: clock, seconds, date (Gregorian or Hijri), prayer names or times, countdown, ticker, Friday strip, slide counter, or any mode screen (D2).
16. Posters (images) in `poster` layout: `contain` + blurred copy as fill (same rule as Phase 1), 16:9 area.
17. **Empty state** (no slide to show): a calm card with logo, full masjid name and the line "Tiada pengumuman buat masa ini". No prayer data. Never a blank screen, never an error text.
18. Every template must render correctly in **all three** areas (12:5, 5:4, 16:9) and in the admin live preview. Layout adapts to `area`; text never clips; minimum sizes unchanged.

Also for every new theme: respect `showArabic` (hide Arabic without breaking layout), `lite` (rule 6), Kematian sobriety (rule 7: no theme decoration at all — for Kerawang this means no carved pattern, plain dark panel), Friday strip (rule 12) in full/bottom/side, khutbah screen (rule 13), current vs next distinguishable at 5 m (rule 2), past opacity ≥ 0.42.

## 4. Announcement-only screen (layout `poster`)

- Set per screen in admin (Skrin → Tambah skrin / Edit): layout **Pengumuman sahaja**.
- Content comes from the same slides, same schedule rules (dates, days, priority, duration, sort order) and the same **screen targeting** (`slides.screen_ids`). A slide with "Semua skrin" appears on both TVs; a slide targeted to the announcement TV appears only there.
- Layout `full` shows no slides (existing behaviour). If a slide's targets contain only `full` screens, the editor warns: "Skrin ini tidak memaparkan pengumuman."
- Playlist: reuse the Phase 1 engine (priority ×2, cross-fade 600 ms, none in lite). One slide only → no transition. Slide counter hidden.
- Offline: identical to other layouts (IndexedDB bundle + cached media).
- Poster upload guidance for this layout: **1920 × 1080 px**, ratio 16:9. Fit labels use the 16:9 area.

## 5. Theme notes

**Falak (G)** — analogue dial; digital time in a small window below the pivot. Dial shows only waktu within the next 12 hours (avoids Syuruk/Maghrib collision on a 12-h face). Rim arc = progress to next waktu. SVG built with explicit elements (no loops needed in markup). Hands update once per second; no CSS transitions on hands in `lite`. Iqamah screen: dial with draining rim.
**Garis Masa (I)** — timeline window = Imsak → Isyak + 72 min; segment widths proportional to real duration; colours per segment fixed (see design). Past 0.42 minimum (design uses 0.4: use 0.42). Labels under the bar at each segment start; if two labels would be closer than 140 px at 1920 scale, stagger the second one vertically. Between Isyak+72 min and the next Imsak, clamp the now-marker to the right end. Syuruk–Zohor is one neutral segment labelled "Syuruk". Imsak shown as a small note. Friday: Zohor label = "Jumaat". Iqamah: 10 blocks of 10 % of the iqamah time each, draining; no block numbers.
**Kerawang (J)** — carved arch panels in timber; patterns drawn once as SVG patterns (not per frame). Current panel gold-lit; others dim. Motifs are simplified: needs review by someone who knows Malay carving before launch. Kematian: no pattern, no gold.
**Seterusnya (K)** — hero = next waktu with azan and iqamah (D5) and a countdown ring; strip/bar/side lists all 7 with azan + iqamah columns; current waktu is shown distinctly (rule 2) in the strip. Ring updates per second in Full, once a minute in Bottom; text only in Side. Friday: Jumaat has azan + khutbah start, no iqamah.

## 6. Admin changes

- **Tambah skrin / Edit skrin:** theme choice grows from 3 to 7 (thumbnails = real theme render, mounted only when visible); layout choice grows from 3 to 4 (**Pengumuman sahaja**, with helper text "Untuk TV kedua. Tiada jam atau waktu solat.").
- When the masjid already has one screen, the "Tambah skrin" sheet suggests Pengumuman sahaja for the second TV (dismissible).
- **Poster upload:** recommended sizes list adds poster layout 1920×1080; fit labels computed for 16:9.
- **Template editor:** live preview screen selector includes poster layout; warning described in §4.
- All strings in `ms.json` / `en.json`.

## 7. Database

`42-themes-round2-migration.sql`: adds the 4 theme values and the `poster` layout value to the enums. `screen_bundle` is unchanged (it already returns `s.theme`, `s.layout` as text). Slides need no change (targeting already exists).

## 8. Acceptance criteria

1. Each new theme renders full / bottom / side / poster, all 5 mode screens, Friday strip, khutbah screen, 10 templates, and the 5 phases, at 1920×1080, with no text below 18 px.
2. `?theme=<id>&layout=poster` shows slides only: no clock, date, prayer text, ticker, counter, or mode screen, even with `&sim=` set to azan/iqamah/khutbah times.
3. Two paired screens on one masjid: TV 1 `full` (or bottom/side) shows prayer times and modes; TV 2 `poster` keeps showing its slides at the same moment.
4. A slide targeted only to TV 2 never appears on TV 1.
5. Unknown theme/layout in a bundle → tenang/full, no crash (unit test).
6. Switching theme in admin → TV changes within ~70 s; if the new theme cannot be loaded (offline) the old one keeps running.
7. Seterusnya iqamah time equals azan + iqamahMin for every waktu, and is absent for Imsak, Syuruk and Friday Zohor.
8. Kematian in every theme: no accent, no decoration (Kerawang included).
9. Pilot Google TV: all 7 themes run at ≥ 25 fps in `lite=1`, no crash after 24 h.
10. `npm test` and `npm run build` pass; no new service-role key exposure.
