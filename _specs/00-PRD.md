# Masjid & Surau TV Display — Product Requirements (v0.1)

> Working name: **[Nama Platform]** (repo slug: `masjid-tv`). Free for any masjid or surau; running cost borne by the owner.
> Status: Phase 1 (display MVP) ready to build. Launch themes: **Alam (A)**, **Serambi (D)**, **Tenang (F)**.

---

## 1. Goal

A web display that runs full-screen on a TV in a masjid or surau, showing JAKIM prayer times, a live clock, prayer-mode screens (azan, iqamah, solat) and announcements. The masjid committee (AJK) manages it from a phone. The display must keep working offline for weeks.

## 2. Users

| User | Needs |
|---|---|
| Jemaah (viewer) | Read time, current/next prayer and announcements from the back of the hall |
| AJK / Siak (admin) | Set masjid name, logo, zone, theme, layout, iqamah minutes; post announcements from a phone (Phase 2) |
| Platform owner | Approve new masjids, keep cost near zero, push updates to all screens |

## 3. Scope by phase

| Phase | Scope | Exit criteria |
|---|---|---|
| **1. Display MVP** (this spec) | TV display only. 3 themes × 3 layouts × all modes. Config from a JSON file + URL params. Prayer times from API with offline cache. Time simulator. PWA. | Runs 7 days unattended on the pilot TV with correct times and transitions |
| 2. Admin + content | Supabase backend, phone admin panel, pairing code, branding upload, posters, template builder (10 templates), playlist, owner approval | Pilot AJK manages screen without help |
| 3. Pilot | 2–3 sites, 1 month | Bug list closed |
| 4. Expand | Themes A→F remaining (B Grid, C Cahaya, E Warisan), Jawi option, Ramadan mode, wrapper APK | Public launch |

## 4. Prayer list and rules

Seven entries, in order: **Imsak, Subuh, Syuruk, Zohor, Asar, Maghrib, Isyak**.

- **Imsak** and **Syuruk** are *markers*, not prayers: no azan, no iqamah.
- **Current** = the latest passed *prayer* (Subuh, Zohor, Asar, Maghrib, Isyak). Between Syuruk and Zohor there is **no current prayer**; only "next" (Zohor) is highlighted. Between Imsak and Subuh, next = Subuh; current = Isyak (of previous night).
- **Next** = the next entry in time order (markers included), wrapping to tomorrow's Imsak after Isyak.
- **Phase** (drives colour palette): Imsak→Syuruk = `subuh`; Syuruk→Asar = `zohor`; Asar→Maghrib = `asar`; Maghrib→Isyak = `maghrib`; Isyak→next Imsak = `isyak`.
- **Friday**: Zohor is labelled **Jumaat**; azan → **Khutbah mode** (no iqamah countdown).
- Times display in **12-hour format without AM/PM** (Malaysian masjid convention), e.g. `1:05`, `7:06`. Configurable to 24h.

## 5. Display modes (state machine)

```
NORMAL ──(T−preAzanMin)──▶ PRE_AZAN ──(T)──▶ AZAN ──(+azanMin)──▶ IQAMAH ──(+iqamahMin[waktu])──▶ SOLAT ──(+solatMin)──▶ NORMAL
Friday Zohor:  ... AZAN ──▶ KHUTBAH (+khutbahMin) ──▶ SOLAT ──▶ NORMAL
Markers (Imsak, Syuruk): no mode change; optional small banner only.
```

| Mode | Screen | Default duration |
|---|---|---|
| NORMAL | Selected layout (Full / Bottom / Side) | — |
| PRE_AZAN | Normal layout + banner "Zohor dalam 5 minit" | 5 min before |
| AZAN | Full-screen: waktu name (BM + Arabic), "Azan" | 3 min |
| IQAMAH | Full-screen countdown, "Luruskan dan rapatkan saf", "Senyapkan telefon bimbit" | Subuh 10, Zohor 10, Asar 10, Maghrib 7, Isyak 10 *(placeholder — confirm with pilot AJK)* |
| SOLAT | Near-black screen, tiny clock only (no distraction) | 12 min |
| KHUTBAH | Full-screen calm: "Khutbah sedang disampaikan", clock | 40 min |

All durations are config values. **Azan/iqamah/solat/khutbah always take over the full screen regardless of layout.**

## 6. Layouts (per screen)

| Layout | Structure |
|---|---|
| `full` | Clock, date (Gregorian + Hijri), all 7 times, countdown, ticker. No posters |
| `bottom` | Poster/announcement area top (~70%), prayer bar bottom |
| `side` | Poster/announcement area + prayer sidebar (theme decides side) |

Poster rule: show uploaded posters **uncropped** (`object-fit: contain`) over a blurred copy of the same image as fill.

## 7. Announcement templates (render as HTML on the TV, never as images)

| # | Key | Fields |
|---|---|---|
| 1 | `pengumuman` | title, body, issuedBy, validUntil |
| 2 | `kuliah` | series (e.g. "Kuliah Maghrib"), topic, speaker, date, time, venue, speakerPhoto? |
| 3 | `kematian` | name, age?, address, solatJenazah (time, place), burial place — **sober styling, no decoration** |
| 4 | `program` | title, description, date, time, venue, organiser, contact |
| 5 | `infaq` | fundName, purpose, collected, target, updatedAt, qrImage, accountName |
| 6 | `mesyuarat` | title, invitation, date, time, venue, issuedBy |
| 7 | `imam_bilal` | weekRange, table[5 waktu × {imam, bilal}] |
| 8 | `kewangan` | weekRange, income[{label, amount}], expense[{label, amount}], balance |
| 9 | `ayat` | arabic, translation, reference — **translation must come from an approved source list, not free text** |
| 10 | `ucapan` | occasion (Aidilfitri/Aidiladha/Maal Hijrah/Maulidur Rasul), message, from |

Every theme renders every template (see theme contract). Phase 1 renders templates from sample JSON in `config/sample-slides.json`.

## 8. Themes

Launch: **`alam`** (Konsep A), **`serambi`** (Konsep D), **`tenang`** (Konsep F). Full token tables and rules in `01-theme-contract.md`. Visual references: `designs/*.dc.html` (design source: read markup + inline styles; they do not run standalone). Live mockups: the "Masjid TV Display Layouts" design canvas.

Switching theme must not change content. Theme is per screen.

## 9. Data

### 9.1 Prayer times source
- API: `GET https://api.waktusolat.app/v2/solat/{zone}?year=YYYY&month=M`
  - Response: `{ zone, year, month, month_number, last_updated, prayers: [{ day, hijri: "1448-05-06", imsak, fajr, syuruk, dhuha, dhuhr, asr, maghrib, isha }] }`
  - Times are **Unix epoch seconds** (inferred from the spec — verify on first call and log a warning if not).
- Server time: `GET https://api.waktusolat.app/chrono` → use to compute clock offset.
- Zones list: verify path (`/zones`) on first build; store a bundled copy in `src/data/zones.json`.

### 9.2 Offline strategy (non-negotiable)
1. On boot and daily at 00:10, fetch **current + next month**; store in IndexedDB keyed `zone:YYYY-MM`.
2. Bundle a **12-month fallback** JSON per pilot zone at build time (`scripts/fetch-year.ts` → `public/data/{zone}-{year}.json`).
3. Read order: IndexedDB → bundled fallback → show "Data waktu tidak tersedia" (never show wrong times).
4. Fonts self-hosted (bundled at build), service worker caches app shell, fonts, data, posters.

### 9.3 Clock accuracy
- On each successful `/chrono` call compute `offset = serverTime − Date.now()`; persist; apply everywhere via a single `now()` function.
- Re-sync every 30 min when online. Show a tiny dot indicator if last sync > 24 h (admin-visible only).

### 9.4 Phase 1 config (`public/config/screen.json`, overridable by URL params)
```json
{
  "masjid": { "fullName": "Nama Masjid / Surau", "shortName": "NM", "logo": "/config/logo.png" },
  "zone": "SGR01",
  "theme": "alam",
  "layout": "full",
  "clock24h": false,
  "showArabic": true,
  "durations": { "preAzanMin": 5, "azanMin": 3, "solatMin": 12, "khutbahMin": 40 },
  "iqamahMin": { "subuh": 10, "zohor": 10, "asar": 10, "maghrib": 7, "isyak": 10 },
  "ticker": ["[Teks pengumuman]"]
}
```

### 9.5 Phase 2 data model (Supabase, for reference)
`organisations`(id, full_name, short_name, logo_url, accent_color, zone, status) → `screens`(id, org_id, pairing_code, theme, layout, last_seen_at) → `prayer_times`(zone, date, imsak…isha, hijri) shared → `org_settings`(durations, iqamah_min) → `slides`(id, org_id, type poster|template, template_key, fields jsonb, starts_at, ends_at, duration_s, days_of_week, priority, sort_order, status) → `members`(org_id, user_id, role).

## 10. Debug & testing (URL params, ignored unless `?debug=1` or on localhost)

| Param | Effect |
|---|---|
| `sim=2026-10-17T13:04:30` | Pretend it is this local time |
| `speed=10` | Clock runs 10× faster |
| `theme=alam\|serambi\|tenang` | Override theme |
| `layout=full\|bottom\|side` | Override layout |
| `mode=azan\|iqamah\|solat\|khutbah` | Force a mode |
| `day=fri` | Force Friday behaviour |

## 11. Non-functional requirements

| Area | Requirement |
|---|---|
| Targets | Google TV / Android TV with **Fully Kiosk Browser** (primary); Chrome kiosk on laptop (pilot) |
| Resolution | Design at 1920×1080; scale the whole stage to fit any 16:9 screen (letterbox other ratios). Test 1280×720 and 3840×2160 |
| Performance | 60 fps not required; no jank on low-end TV. **No `backdrop-filter` on low-end mode**: auto-disable if measured frame time > 50 ms, or `?lite=1` |
| Burn-in | Shift whole stage by 0–4 px every 10 min |
| Resilience | Auto-reload page daily at 03:00; recover from JS errors (error boundary → reload after 30 s) |
| Readability | Smallest text on screen ≥ 18 px at 1080p; times ≥ 54 px; contrast ≥ 4.5:1 |
| Language | BM labels; Arabic names optional (`showArabic`) |

## 12. Acceptance criteria — Phase 1

1. With `?sim=` at 13:04:00 on a weekday (SGR01, Oct 2026 data), screen shows PRE_AZAN banner; at Zohor time switches to AZAN; then IQAMAH counting down from the configured minutes; then SOLAT; then NORMAL with Asar as next.
2. Same on a Friday → AZAN → KHUTBAH → SOLAT.
3. Between Syuruk and Zohor: no "Sekarang" highlight; Zohor shows as next.
4. All 3 themes × 3 layouts render correctly at 1080p; current and next prayers clearly distinguishable from 5 m away (manual check on pilot TV).
5. Disconnect WiFi for 48 h (simulated with `sim` + offline) → times still correct from cache/fallback.
6. Phase palette changes at the boundaries in §4.
7. Clock offset from `/chrono` is applied (verify by setting device clock wrong by 3 min).
8. Runs 7 days unattended on the pilot TV.

## 13. Open items (needed before pilot)

- Pilot site: area → JAKIM zone code; TV size; viewing distance.
- Pilot AJK's actual iqamah minutes per waktu and khutbah length.
- Platform name (domain, `_brand/`).
