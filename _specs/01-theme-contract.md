# Theme Contract (v0.3 — adds 4 themes, the `poster` layout and iqamah time)

Every theme is a self-contained folder `src/themes/<id>/` that implements the interface below. The engine (time, modes, data, playlist) never contains theme styling; themes never contain prayer logic.

Visual references: `_specs/designs/` (`A-*` = Alam, `D-*` = Serambi, `F-*` = Tenang, `G-*` = Falak, `I-*` = Garis Masa, `J-*` = Kerawang, `K-*` = Seterusnya). The `.dc.html` files are design-tool source (they do not run standalone): read the markup, inline styles and the data in each file's script block; values below are copied from them. **G/I/J/K mockups are 1280×720: every value below is already ×1.5 and raised to the §2 minimums (`40-PRD-themes-round2.md` D4).**

v0.3 changes (2026-10-29): `LayoutKey` `poster`, `WaktuView.iqamah`, `posterArea` incl. `poster`, `screens.unavailable` (already in code), templates `area` prop, rules 14–19, sections 6–9 (Falak, Garis Masa, Kerawang, Seterusnya).

---

## 1. Interface

```ts
export type PhaseKey = 'subuh' | 'zohor' | 'asar' | 'maghrib' | 'isyak';
export type WaktuKey = 'imsak' | 'subuh' | 'syuruk' | 'zohor' | 'asar' | 'maghrib' | 'isyak';
export type LayoutKey = 'full' | 'bottom' | 'side' | 'poster';   // poster = announcement-only screen (rules 14–17)

export interface WaktuView {
  key: WaktuKey;
  label: string;        // "Zohor" or "Jumaat" on Friday
  arabic: string;       // "ظهر"
  time: string;         // "1:05" (already formatted)
  state: 'past' | 'current' | 'next' | 'upcoming';
  isMarker: boolean;    // imsak, syuruk
  iqamah?: string;      // "1:15": azan + iqamahMin[key], formatted like `time`. Undefined for imsak, syuruk and Friday zohor.
  at: number;           // the same moment as epoch ms (NaN if unknown), for drawing only: angles/positions via src/core/dial.ts (Falak). Never for prayer logic in a theme.
}

export interface DisplayState {
  now: Date;            // offset-corrected
  clock: string;        // "1:20"
  seconds: string;      // "36"
  gregorian: string;    // "Sabtu, 17 Oktober 2026"
  hijri: string;        // "6 Jamadilawal 1448H"
  phase: PhaseKey;
  waktu: WaktuView[];   // always 7, in order
  current?: WaktuView;
  next: WaktuView;
  countdownText: string; // "2 jam 51 minit"
  mode: 'normal' | 'pre_azan' | 'azan' | 'iqamah' | 'solat' | 'khutbah';
  modeTarget?: WaktuView;      // the waktu the mode is about
  modeRemainingSec?: number;   // for iqamah / khutbah
  modeProgress?: number;       // 0..1 elapsed
  isFriday: boolean;
  friday?: FridayInfo;         // present on Friday from 00:00 until Solat Jumaat ends, if enabled
  masjid: { fullName: string; shortName: string; logoUrl?: string };
  showArabic: boolean;
  ticker: string[];
  lite: boolean;               // low-end device: no blur, fewer effects
}

export interface FridayInfo {
  azan: string;          // "1:05"
  khutbahStart: string;  // "1:08"
  khutbahMin: number;    // 40
  solatStart: string;    // "1:48"  (estimate)
  solatEnd: string;      // "2:00"  (estimate)
  khutbahEnd: Date;      // for the khutbah screen countdown
}

export interface ThemeDefinition {
  id: 'alam' | 'serambi' | 'tenang' | 'falak' | 'garis' | 'kerawang' | 'seterusnya';
  name: string;                 // shown in admin: "Alam", "Serambi", "Tenang", "Falak", "Garis Masa", "Kerawang", "Seterusnya"
  fonts: string[];              // font families to self-host
  layouts: Record<LayoutKey, React.FC<{ s: DisplayState; slide?: SlideView; slideKey?: string; counter?: { position: number; total: number } }>>;
  posterArea: Record<'bottom' | 'side' | 'poster', { x: number; y: number; w: number; h: number }>; // rule 10
  screens: {
    preAzanBanner: React.FC<{ s: DisplayState }>;
    azan: React.FC<{ s: DisplayState }>;
    iqamah: React.FC<{ s: DisplayState }>;
    solat: React.FC<{ s: DisplayState }>;
    khutbah: React.FC<{ s: DisplayState }>;   // must show "Dijangka tamat ±{s.friday.solatStart}" + thin progress line (s.modeProgress)
    unavailable: React.FC<{ u: UnavailableState }>; // "Data waktu tidak tersedia" (in code since v0.1)
  };
  fridayInfo: React.FC<{ s: DisplayState }>;   // the Friday strip (rule 12); render nothing if !s.friday
  templates: Record<TemplateKey, React.FC<{ s: DisplayState; fields: any; area: 'bottom' | 'side' | 'poster' }>>; // all 10; `area` (rule 18)
  posterFrame: React.FC<{ s: DisplayState; imageUrl: string }>;
}
```

## 2. Rules every theme must follow

1. Stage is a fixed **1920×1080** box; the engine scales it. Use px inside the stage.
2. **Current** prayer must be distinguishable from **next** at 5 m: different fill *and* weight, not colour alone.
3. Past prayers may fade (opacity ≥ 0.42). Markers (Imsak, Syuruk) never get "Sekarang".
4. Times ≥ 54 px in Full and Side layouts, ≥ 44 px in Bottom bar.
5. All colour comes from the theme's token table for the current `phase`; no hard-coded colours in components except those listed.
6. `lite` mode: drop `backdrop-filter`, blurs, glows and large shadows; keep layout identical.
7. Kematian template: no accent colours, no decoration, regardless of theme.
8. Arabic text uses `lang="ar" dir="rtl"`.
9. Labels in BM. Status words: **SEKARANG**, **SETERUSNYA**.
10. **Poster/announcement area has a fixed aspect ratio in every theme** (so the admin app's recommended poster sizes fit all themes): **`bottom` layout = 12:5** (e.g. 1824×760 or 1920×800 inside the stage); **`side` layout = 5:4** (e.g. 1260×1008 or 1350×1080); **`poster` layout = 16:9, the full stage 0,0,1920,1080**. The area may sit inside a card with padding, but the poster box itself must be exactly this ratio. Expose it as `posterArea: Record<'bottom'|'side'|'poster', {x,y,w,h}>` on the `ThemeDefinition`. The mockups in `designs/` vary slightly — the ratio rule wins. One poster size fits every theme: the round-2 themes use bottom **48,24,1824,760** with the prayer bar below it (owner decision 2026-10-29; the G/I/J/K-Bottom split layouts are not used). (Added in Phase 2; see `10-PRD-phase2.md` §6.)
11. Announcement templates must render correctly inside the poster area at all three ratios and in the admin live preview (scaled stage). See rule 18.
12. **Friday strip** (`fridayInfo`), shown by every layout when `s.friday` is set and mode is `normal` or `pre_azan`:
    - Text: **SOLAT JUMAAT** label, then `Azan {azan} · Khutbah {khutbahStart} (±{khutbahMin} minit) · Solat ±{solatStart}`. Text ≥ 30 px; label weight ≥ 700.
    - `full`: a pill directly under the date/countdown block, never covering the prayer list.
    - `bottom`: a pill at the top edge of the prayer bar, left-aligned with the clock; the 12:5 poster area keeps its size (shrink the gap above the bar, not the poster).
    - `side`: a card under the prayer list in the side column.
    - Colours from the phase tokens (accent fill at low opacity + accent text); Serambi uses gold. No animation except a fade in/out.
    - The Jumaat row in the prayer list keeps its normal look; the strip is extra information, not a replacement.
13. Khutbah screen: title "Khutbah sedang disampaikan", clock, "Dijangka tamat ±{s.friday.solatStart}", thin progress line from `s.modeProgress`; calm, no countdown digits ticking every second.
14. **`poster` layout** renders the current slide edge-to-edge in the 1920×1080 stage (16:9). The only chrome is a small **brand chip** (logo + short name, text ≥ 18 px, bottom-left, 48 px safe margin, theme colours, 70 % opacity). No frame, border or decoration around the slide beyond what the theme's `posterFrame` / template already draws.
15. **`poster` layout never shows** a clock, seconds, date (Gregorian or Hijri), prayer names or times, countdown, ticker, Friday strip, slide counter, or any mode screen: prayer modes never replace the slides (PRD round 2 D2; the engine sets `mode: 'normal'` for poster screens). It still receives `s.phase`, only to tint theme colours (D3).
16. Poster images in `poster` layout: `contain` + blurred copy as fill (no blur in `lite`), 16:9 area.
17. **Empty state** (no slide to show): a calm card with logo, full masjid name and "Tiada pengumuman buat masa ini". No prayer data. Never blank, never an error text.
18. Every template renders correctly in **all three** areas (12:5, 5:4, 16:9) and in the admin live preview. Layout adapts to `area`; text never clips; minimum sizes unchanged.
19. **Unknown theme or layout** (e.g. an older TV app receiving a newer id) falls back to `tenang` / `full`: never a crash or a blank screen (PRD round 2 D7).
20. **Ticker in every theme** (owner decision 2026-10-29): the `full` layout shows `s.ticker` whenever it has text, at least 26 px, labelled "PENGUMUMAN" or in a band of its own. Scrolling or one item at a time (`shared/ticker.ts`: every 12 s); `lite` = one item at a time, no animation. Make room for it (shrink the list or clock), never cover prayer times. Never in the `poster` layout (rule 15).

Round-2 themes follow rules 2, 3, 6, 7, 8, 12 and 13 exactly as written above; there is no exception for any of them. Their Arabic text (e.g. the `ayat` template) uses **Noto Naskh Arabic** 400–600 (already self-hosted).

---

## 3. Theme: `alam` (Konsep A, "Alam")

**Concept:** illustrated landscape (sky gradient, sun/moon, 3 mountain layers, mosque silhouette) that changes per phase; frosted-glass cards on top.

**Fonts:** Plus Jakarta Sans 400–800 · Noto Naskh Arabic 500–600

**Per-phase tokens**

| phase | sky (linear-gradient 180deg) | sun/moon colour | sun pos (x,y,r) | glowR | stars | layer1 | layer2 | layer3 |
|---|---|---|---|---|---|---|---|---|
| subuh | #0E1A3D 0% → #24407E 45% → #6F7FB8 72% → #F2B27A 100% | #FFD9A8 | 960,720,60 | 420 | 0.7 | #3A4F8F | #22346A | #121F45 |
| zohor | #F7CF6A 0% → #F2AE3C 45% → #E58A27 100% | #FFF4D2 | 1500,230,110 | 520 | 0 | #D9822B | #B5611C | #7A3D10 |
| asar | #F6A15A 0% → #E2673A 48% → #9E3320 100% | #FFE0B0 | 1380,470,95 | 480 | 0 | #9C3A1E | #6E2412 | #3E1209 |
| maghrib | #2E2D6B 0% → #6C5BA8 45% → #C89BC4 75% → #F4B8A0 100% | #FFD3B5 | 960,780,70 | 460 | 0.35 | #6A5AA6 | #463C82 | #251F52 |
| isyak | #041E26 0% → #0B3F4C 52% → #1E7A85 100% | #E9F6F7 | 1520,190,44 | 260 | 0.9 | #0F5662 | #0A3B45 | #05232A |

**Fixed tokens**
- Text: #FFFFFF. Scrim over sky: `linear-gradient(180deg, rgba(0,0,0,.28) 0%, transparent 30%, transparent 50%, rgba(0,0,0,.38) 100%)`
- Glass card: bg `rgba(8,18,28,0.32)`, border `1px solid rgba(255,255,255,0.24)`, `backdrop-filter: blur(18px)`, radius 26
- **Current card:** bg `rgba(255,255,255,0.95)`, text `#0F2E24`, chip "SEKARANG" bg `#1F7A55` text white
- **Next card:** border `2px solid #F5D33B`, chip "SETERUSNYA" bg `#F5D33B` text `#2A2400`
- Brand green `#1F7A55`; yellow `#F5D33B`; ticker band `rgba(6,24,18,0.74)`
- Iqamah screen: bg `radial-gradient(circle at 50% 48%, #175A42 0%, #0B2E22 52%, #061B14 100%)`; ring r=250 stroke 28, track `rgba(255,255,255,0.1)`, progress gradient `#9BE15D → #F5D33B`; countdown 168 px/800

**Sizes (Full):** clock 250/700, seconds 72; prayer name 28/700, Arabic 26, time 56/800; header name 40/700.
**References:** `designs/A-Full`, `A-Bottom` (Kuliah template), `A-Side` (poster), `A-Iqamah`.

---

## 4. Theme: `serambi` (Konsep D, "Serambi")

**Concept:** dark colonnade; each of the 7 waktu is an arch window showing its own sky. Current arch is taller, gold-outlined and glowing.

**Fonts:** Barlow 400–700 · Barlow Condensed 500–700 (all numerals) · Reem Kufi 500–600 (Arabic labels) · Amiri 400–700 (Quranic / hadith text)

**Fixed tokens**
- Background `#0B1114`; sidebar `#111A1D`; emerald `#123C30` / `#15332B`; gold `#E3B04B`; gold-on text `#1A1405`; muted text `rgba(255,255,255,0.6)`
- Ambient glow behind arcade: radial ellipse of the current arch's `glow` colour at 45% opacity

**Arch skies (fixed per waktu, not per phase)**

| waktu | sky (linear-gradient 180deg) | glow |
|---|---|---|
| imsak | #0B1638 → #1F2F66 | #1F2F66 |
| subuh | #1B2C5E 0% → #5C6FB0 60% → #E9A97A 100% | #5C6FB0 |
| syuruk | #5E86C4 → #F4C38E | #F4C38E |
| zohor | #2F7FC6 → #8CC6EE | #2F7FC6 |
| asar | #3D7DB8 → #E9B36A | #E9B36A |
| maghrib | #3B2D6B 0% → #C46A7A 60% → #F2A65E 100% | #C46A7A |
| isyak | #050B1A → #0E2A44 | #0E2A44 |

**Arch rules**
- Shape: `border-radius: (w/2)px (w/2)px 18px 18px` (explicit px, never 999px).
- Text overlay inside arch: `linear-gradient(0deg, rgba(5,10,12,.78) 0%, rgba(5,10,12,.35) 38%, transparent 62%)`.
- **Current:** height +60 px (Full) / +50 px (Bottom), `box-shadow: 0 0 0 4px #E3B04B, 0 0 70px rgba(227,176,75,.35)`, chip "SEKARANG" gold bg.
- **Next:** `box-shadow: 0 0 0 2px rgba(227,176,75,.55)`, chip "SETERUSNYA" dark bg gold text.
- **Past:** opacity 0.42. Upcoming: 0.92.
- Iqamah: single large arch (780×920, gold 3 px border), fills with gold light from the bottom: height = progress.

**Sizes (Full):** clock 236/600 condensed; arch 236×560 (current 620); arch time 78/600 condensed; name 34/600; Arabic 28.
**References:** `designs/D-Full`, `D-Bottom` (Program template), `D-Side` (Ayat template), `D-Iqamah`.

---

## 5. Theme: `tenang` (Konsep F, "Tenang")

**Concept:** minimal, generous whitespace, soft pastel per phase, hairlines only. Current prayer = white floating pill.

**Fonts:** Manrope 300–800 · Noto Naskh Arabic 400–500

**Per-phase tokens**

| phase | bg | fg | muted | accent | pill | card | rule |
|---|---|---|---|---|---|---|---|
| subuh | #E8EAF6 | #1F2440 | #5F6585 | #4F58AE | #FFFFFF | #FFFFFF | rgba(31,36,64,.12) |
| zohor | #EAF3F8 | #14303D | #56707E | #23709A | #FFFFFF | #FFFFFF | rgba(20,48,61,.12) |
| asar | #F8EFE6 | #3B2A1E | #7E6853 | #A9612A | #FFFFFF | #FFFFFF | rgba(59,42,30,.12) |
| maghrib | #F6E9EC | #3A2230 | #80616E | #9C3F5E | #FFFFFF | #FFFFFF | rgba(58,34,48,.12) |
| isyak | #131A2B | #E9ECF5 | #8F98B3 | #9DB0EE | rgba(255,255,255,.09) | #1B2338 | rgba(255,255,255,.10) |

**Weights (updated for distance readability)**
- Large clock: **300**; seconds 400
- Prayer times: **500**; current time **700** in accent colour
- Prayer names: **500**; current name **800**
- Labels, date, body text: **500**

**Rules**
- **Current:** pill bg `pill`, radius 999, `box-shadow: 0 18px 40px rgba(20,30,50,.10)`; name 800, time 700 accent.
- **Next:** shown in the countdown line ("Asar dalam 2 jam 51 minit"); no extra decoration in the list.
- Dividers: 1 px `rule` hairlines only. No borders on cards; cards use soft shadow `0 30px 70px rgba(20,30,50,.08)`, radius 40.
- Iqamah: countdown 360/300, 1100 px track (4 px, `rule`) with accent bar (8 px) shrinking from full to zero.

**Sizes (Full):** clock 280/300; list row height 100, name 38, Arabic 30, time 62.
**References:** `designs/F-Full`, `F-Bottom` (Pengumuman template), `F-Side` (Kewangan template), `F-Iqamah`.

---

## Round-2 themes: common Bottom layout

In all four themes below, **Bottom** = poster area **1824×760 at 48,24** (rule 10) with a ~**296 px prayer bar** under it holding the theme's clock element and the 7 waktu (time ≥ 44, current = different fill + weight). The Friday strip is a pill on the bar's top edge; the poster keeps its size. The `*-Bottom` mockups are references for colours and the template card only; their split layouts are replaced (owner decision 2026-10-29).

---

## 6. Theme: `falak` (Konsep G, "Falak")

**Concept:** analogue dial; digital time in a small window under the pivot; rim arc = progress since the current waktu.

**Fonts:** Fraunces 500–600 (masjid name, prayer names, footers) · Manrope 300 / 500 / 700

**Per-phase tokens** (dial face is automatic by phase, PRD D6)

| phase | bg | face | plate | ink | hand | sec |
|---|---|---|---|---|---|---|
| subuh | #26305E | dark | #12161C | #EFE7D3 | #F3EBD8 | #E3B25A |
| zohor | #14566A | light | #F7F1E3 | #23252B | #1D1F24 | #B3541E |
| asar | #6A4E2A | light | #F7F1E3 | #23252B | #1D1F24 | #B3541E |
| maghrib | #7A2F3A | dark | #12161C | #EFE7D3 | #F3EBD8 | #E3B25A |
| isyak | #0E1428 | dark | #12161C | #EFE7D3 | #F3EBD8 | #E3B25A |

**Fixed tokens**
- Text #F7F1E3; gold #E9BD63 (progress arc, waktu dots, dial labels); dial rim rgba(255,255,255,0.16)
- Current row pill #F7F1E3 with ink #1B1D22; row rule rgba(247,241,227,0.16); bar / side column rgba(0,0,0,0.26)
- Template card #F7F1E3 / #1B1D22, card line #D9D1BD, muted #3A3D45; Iqamah label on the light face #8A4A12

**Rules**
- The dial shows only waktu within the next 12 hours (avoids the Syuruk/Maghrib collision on a 12-h face). Current dot r = 11 (SVG units), others r = 7.
- Hands step once a second; no CSS transitions on hands in `lite`.
- Imsak/Syuruk rows opacity 0.74. **Current:** pill fill + name 600 / time 700 (rule 2). **Next:** the "X dalam …" line.
- Iqamah: the dial with a draining rim, countdown inside the dial.

**Sizes (Full):** dial 936 (1 SVG unit ≈ 2.03 px); dial time 49/500; dial labels 35/700; masjid name 42/600; "● WAKTU" 22.5/700; remaining 90/300; row name 39/500; row time **54**/500.
**Side:** column 600; dial 300; row name 33, time **54**. **Iqamah:** dial 780; countdown 146/300; footer 51.
**References:** `G-Full` (canvas Main), `G-Bottom` (Pengumuman card), `G-Side` (Kewangan card), `G-Iqamah`.

---

## 7. Theme: `garis` (Konsep I, "Garis Masa")

**Concept:** the day as one proportional bar from Imsak to Isyak + 72 min; segment width (or height in Side) = real duration.

**Fonts:** Fraunces 500–600 · Manrope 200 (clock, countdown) / 500 / 700

**Per-phase tokens:** bg subuh #141A33 · zohor #0F2230 · asar #241C10 · maghrib #2A1419 · isyak #0A0F1F. Accent = colour of the current segment.

| segment | imsak | subuh | syuruk (to zohor, neutral) | zohor | asar | maghrib | isyak |
|---|---|---|---|---|---|---|---|
| colour | #7A84AE | #B8A9F0 | #2D3A4A (ink #A9B6C4) | #8CCBF2 | #EDC27F | #F09A8C | #8FA5F0 |

**Fixed tokens**
- Text #F4F1EA; segment ink #10151F; now-line and now-chip #FFFFFF (chip ink #10151F); label rule rgba(255,255,255,0.3)
- Side column rgba(255,255,255,0.05); template card #F4F1EA / #10151F, card line #DCD6C8

**Rules**
- Segments: past **0.42** · current 1 + glow `0 0 42px <colour>` (none in `lite`) · upcoming 0.72. Gap 4.5 px, min width 6 px.
- Labels under the bar at each segment start; if two are closer than 140 px, stagger the second vertically. **Side:** push labels apart to ≥ 64 px with a thin leader line to the true point.
- Between Isyak + 72 min and the next Imsak the now-marker clamps to the right end.
- The neutral segment is labelled "Syuruk"; Imsak is a small note; Friday: "Jumaat". Current label time 700 (rule 2).
- Iqamah: **10 equal blocks, each = 10 % of `iqamahMin`** for that waktu, draining left to right; no block numbers (the countdown shows the time).

**Sizes (Full):** clock 375/200; "Baki …" 45; bar 1680×96 (radius 15); segment label 30/700; now-chip 36/700; label name 25.5, time **54**.
**Bottom bar:** clock 120/200; timeline ~1300×72; label time 44. **Side:** clock 150/200; bar 39×630; label time **54**. **Iqamah:** countdown 435/200; blocks 66 tall, gap 12.
**References:** `I-Full`, `I-Bottom`, `I-Side`, `I-Iqamah`.

---

## 8. Theme: `kerawang` (Konsep J, "Kerawang")

**Concept:** carved Malay timber arch panels; the current panel is gold-lit. Patterns are SVG `<pattern>`s drawn once, never per frame. *Motifs are simplified and need review by someone who knows Malay carving before launch.*

**Fonts:** Fraunces 500–600 · Manrope 200 (iqamah countdown) / 300 / 500 / 700

**Per-phase tokens:** bg subuh #3F3552 · zohor #5E3D24 · asar #6C4626 · maghrib #5C2B27 · isyak #241A28, with grain `repeating-linear-gradient(90deg, rgba(0,0,0,.06) 0 3px, transparent 3px 12px)`.

**Fixed tokens**
- Text #F6EBD4; gold #F2C45A; timber #2E1B0F
- Unlit plaque #3A2414, border #8A6428, carving #4E3120; "awan" border motif #D4A94E in 39 px bands top and bottom (tile 90×39); carving tile 72
- Template card #F6EBD4 / #2E1B0F with a 9 px #D4A94E frame and inset rings #F6EBD4 / #8A6428; muted #4A3322, line #C9B58A

**Rules**
- **Current:** gold border + gold plaque (ink #2E1B0F) + glow `0 0 105px 9px rgba(242,196,90,.55)` (none in `lite`) + time 700. Imsak/Syuruk 0.82.
- Arch radius in explicit px (Full 129 top / 21 bottom), never 999px.
- **Kematian:** no pattern, no gold: plain #2E1B0F panel.

**Sizes (Full):** header 177 tall (name 51/600, clock 138/300, next line 30); panel border 6; plaque 225 tall, name 39/600, time 69/500.
**Bottom bar:** short arch panels, plaque time 48. **Side:** column 600; clock 114/300; carving strip 105; name 34.5, time **54**; poster 1185×948 (5:4). **Iqamah:** arch 660×912 (radius 330, gold border 9) filling with light from the bottom as time passes; countdown 315/200; footer 57.
**References:** `J-Full`, `J-Bottom`, `J-Side`, `J-Iqamah`.

---

## 9. Theme: `seterusnya` (Konsep K, "Seterusnya")

**Concept:** the next waktu is the hero, with its azan and iqamah times (PRD D5) and a countdown ring.

**Fonts:** Manrope 300 / 500 / 700 / 800 (no other family)

**Per-phase tokens:** bg subuh #3A2F7A · zohor #0E6C8A · asar #9A5B10 · maghrib #A8323F · isyak #101B4A.

**Fixed tokens**
- Text #FFFFFF; waktu cell rgba(255,255,255,0.12)
- **Next** cell #FFFFFF with ink = phase bg; **current** cell rgba(255,255,255,0.24) + 3 px #FFFFFF border + name 800 (rule 2)
- Ring track rgba(255,255,255,0.2), arc #FFFFFF; template card #FFFFFF / #14202B, line #DCE3EA, muted #3D4A56

**Rules**
- Hero = `s.next` (never a marker); iqamah = `WaktuView.iqamah`. Friday Zohor (Jumaat): azan + khutbah start (`s.friday.khutbahStart`), no iqamah.
- The ring updates every second in Full and once a minute in Bottom; Side shows text only.

**Sizes (Full):** "SETERUSNYA" 30/700; hero name 198/800; azan 138/700; iqamah 138/300; ring 510 (stroke 27), remaining 93/700; strip 168 tall, cell time **54**/500.
**Bottom bar:** compact hero (name 66/800, azan + iqamah 54, ring 200); cells time 48. **Side:** column 660; hero 96/800; azan + iqamah columns **54**. **Iqamah:** countdown 495/800; bar 1140×12.
**References:** `K-Full`, `K-Bottom`, `K-Side`, `K-Iqamah`.

---

## 10. Template coverage in references

| Template | Reference to adapt for all 7 themes |
|---|---|
| kuliah | A-Bottom; also G/I/J/K-Bottom ("Pengumuman am" card) |
| program | D-Bottom |
| ayat | D-Side |
| pengumuman | F-Bottom |
| kewangan | F-Side; also G/I/J/K-Side |
| kematian, infaq, imam_bilal, mesyuarat, ucapan | No reference in launch themes yet: design within each theme's tokens following §2 rules (sober Kematian) |
