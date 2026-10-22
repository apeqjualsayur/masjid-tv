# Theme Contract (v0.2 — adds Friday info)

Every theme is a self-contained folder `src/themes/<id>/` that implements the interface below. The engine (time, modes, data, playlist) never contains theme styling; themes never contain prayer logic.

Visual references: `designs/` (`A-*` = Alam, `D-*` = Serambi, `F-*` = Tenang). The `.dc.html` files are design-tool source (they do not run standalone): read the markup, inline styles and the data in each file's script block; values below are copied from them.

---

## 1. Interface

```ts
export type PhaseKey = 'subuh' | 'zohor' | 'asar' | 'maghrib' | 'isyak';
export type WaktuKey = 'imsak' | 'subuh' | 'syuruk' | 'zohor' | 'asar' | 'maghrib' | 'isyak';
export type LayoutKey = 'full' | 'bottom' | 'side';

export interface WaktuView {
  key: WaktuKey;
  label: string;        // "Zohor" or "Jumaat" on Friday
  arabic: string;       // "ظهر"
  time: string;         // "1:05" (already formatted)
  state: 'past' | 'current' | 'next' | 'upcoming';
  isMarker: boolean;    // imsak, syuruk
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
  id: 'alam' | 'serambi' | 'tenang';
  name: string;                 // shown in admin: "Alam", "Serambi", "Tenang"
  fonts: string[];              // font families to self-host
  layouts: Record<LayoutKey, React.FC<{ s: DisplayState; slide?: SlideView }>>;
  screens: {
    preAzanBanner: React.FC<{ s: DisplayState }>;
    azan: React.FC<{ s: DisplayState }>;
    iqamah: React.FC<{ s: DisplayState }>;
    solat: React.FC<{ s: DisplayState }>;
    khutbah: React.FC<{ s: DisplayState }>;   // must show "Dijangka tamat ±{s.friday.solatStart}" + thin progress line (s.modeProgress)
  };
  fridayInfo: React.FC<{ s: DisplayState }>;   // the Friday strip (rule 12); render nothing if !s.friday
  templates: Record<TemplateKey, React.FC<{ s: DisplayState; fields: any }>>; // all 10
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
10. **Poster/announcement area has a fixed aspect ratio in every theme** (so the admin app's recommended poster sizes fit all themes): **`bottom` layout = 12:5** (e.g. 1824×760 or 1920×800 inside the stage); **`side` layout = 5:4** (e.g. 1260×1008 or 1350×1080). The area may sit inside a card with padding, but the poster box itself must be exactly this ratio. Expose it as `posterArea: Record<'bottom'|'side', {x,y,w,h}>` on the `ThemeDefinition`. The mockups in `designs/` vary slightly — the ratio rule wins. (Added in Phase 2; see `10-PRD-phase2.md` §6.)
11. Announcement templates must render correctly inside the poster area at both ratios and in the admin live preview (scaled stage).
12. **Friday strip** (`fridayInfo`), shown by every layout when `s.friday` is set and mode is `normal` or `pre_azan`:
    - Text: **SOLAT JUMAAT** label, then `Azan {azan} · Khutbah {khutbahStart} (±{khutbahMin} minit) · Solat ±{solatStart}`. Text ≥ 30 px; label weight ≥ 700.
    - `full`: a pill directly under the date/countdown block, never covering the prayer list.
    - `bottom`: a pill at the top edge of the prayer bar, left-aligned with the clock; the 12:5 poster area keeps its size (shrink the gap above the bar, not the poster).
    - `side`: a card under the prayer list in the side column.
    - Colours from the phase tokens (accent fill at low opacity + accent text); Serambi uses gold. No animation except a fade in/out.
    - The Jumaat row in the prayer list keeps its normal look; the strip is extra information, not a replacement.
13. Khutbah screen: title "Khutbah sedang disampaikan", clock, "Dijangka tamat ±{s.friday.solatStart}", thin progress line from `s.modeProgress`; calm, no countdown digits ticking every second.

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

## 6. Template coverage in references

| Template | Reference to adapt for all 3 themes |
|---|---|
| kuliah | A-Bottom |
| program | D-Bottom |
| ayat | D-Side |
| pengumuman | F-Bottom |
| kewangan | F-Side |
| kematian, infaq, imam_bilal, mesyuarat, ucapan | No reference in launch themes yet: design within each theme's tokens following §2 rules (sober Kematian) |
