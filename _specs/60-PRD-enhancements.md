# Masjid View — Enhancements PRD: Countdowns, Notices, Imam & Bilal roster, Android TV app (v0.1)

> Builds on `00-PRD.md`, `01-theme-contract.md`, `10-PRD-phase2.md`, `40-PRD-themes-round2.md`, `50-PRD-sound.md`.
> SQL: `62-enhancements-migration.sql` · Build steps: `61-enhancements-prompts.md`.
> Decided with Afiq, 17 Nov 2026.

---

## 1. Scope

| # | Feature | Where it shows | Sprint |
|---|---|---|---|
| E-A | **Activity notice**: Tangguh (postponed) / Batal (cancelled) on an existing activity slide + a standalone "Penangguhan" template | Poster area (slide) | 1 |
| E-B | **Activity countdown** on Kuliah / Program / Mesyuarat slides | Inside that slide only | 1 |
| E-C | **Android TV app** (APK, sideload) downloaded from the admin portal | TV | 1 |
| E-D | **Hari kebesaran Islam countdown** (Ramadan, Aidilfitri …) | One slide in the poster rotation only | 2 |
| E-E | **Jadual Imam & Bilal**: roster by day (optionally per waktu), shown as a slide | One slide in the poster rotation only | 3 |

Not in scope: anything on the clock/prayer area of the themes, ticker changes, Google Play listing (Phase B, §8.7).

## 2. Decisions (locked)

| ID | Decision |
|---|---|
| D1 | Hari kebesaran is **a slide only** (template `hari_kebesaran`). No header chip, no ticker. |
| D2 | Activity countdown appears **only inside the activity's own slide**. No global "next activity" strip. |
| D3 | Imam & Bilal appear **only as a slide** (template `jadual_petugas`). The roster is **by day** (one imam + one bilal for the whole day); per-waktu entries are optional exceptions for a day. Roles: imam, bilal. |
| D4 | Notices: **Tangguh** and **Batal**. Not added to the ticker. |
| D5 | Android app: **sideloaded APK first** (pilot). Admin downloads it from the admin portal; TV installs via the "Downloader" app at `masjidview.my/apk`. Play Store later; account type (personal vs organisation) undecided. |
| D6 | Islamic event dates come from a **platform-owned table** (`islamic_events`) filled by the platform owner from JAKIM's takwim. No date is computed from an algorithm (Umm al-Qura can differ from Malaysia by a day). Ramadan/Syawal stay **"jangkaan"** until the official announcement. |
| D7 | All new TV logic is computed on the TV from the bundle, so it stays correct offline (same principle as slides' start/end). |
| D8 | One migration for all features (additive, safe for TVs on the old app). |
| D9 | The old static template `imam_bilal` stays renderable and editable but is **hidden from the template picker**. |
| D10 | (E1 audit, 17 Nov 2026) Event time = existing `dateIso` + `time` (§4.1). A prayer-relative time ("Selepas Maghrib") gives day-level countdown states only (§4.2). `newAt` is always an exact date + clock time. |
| D11 | There is one Supabase project (named `masjidview-dev`, ref `fiensjdqyitikskblagy`), and it is production. The migration is applied there directly after review and a backup; there is no separate dev run. |
| D12 | Before AJK use notices, every TV must run the new app: bump `RELEASE.minTvBuild` at rollout (an old app would show a cancelled kuliah as a normal, priority slide). |

## 3. E-A — Activity notice (Tangguh / Batal)

### 3.1 Data
Stored inside the slide's `fields` (no new column):
```json
"notice": { "kind": "tangguh" | "batal", "newAt": "2026-11-28T20:45" | null,
            "reason": "Penceramah uzur" | null, "setAt": "<ISO>", "prevPriority": false }
```
- Allowed only on templates `kuliah`, `program`, `mesyuarat` (DB check, §9).
- `reason` ≤ 100 chars. `newAt` only for `tangguh`; null = "Tarikh baru akan dimaklumkan".

### 3.2 Admin
- Kandungan row menu (⋯) and editor top bar, for kuliah/program/mesyuarat: **Tangguhkan…**, **Batalkan…**. When a notice exists: **Kemas kini notis**, **Tarik balik notis**.
- **Tangguh sheet:** new date + time (or toggle "Tarikh baru akan dimaklumkan"), reason (optional; chips "Penceramah uzur", "Cuaca tidak mengizinkan", "Hal yang tidak dapat dielakkan"), live preview, **Sahkan**.
- **Batal sheet:** reason (optional), preview, **Sahkan**.
- On confirm: save `notice`; set `priority = true` (old value kept in `prevPriority`); set `ends_at` by §3.3; status stays as it is (a paused slide stays paused, with a hint "Slaid ini dijeda — terbitkan untuk papar notis").
- **Tarik balik**: removes `notice`, restores `priority` from `prevPriority`, keeps `ends_at` and shows "Semak tarikh tamat slaid".

### 3.3 How long the notice stays (`ends_at`), set automatically, editable after
Let `E` = original event time (from the slide's date/time fields; §4.1).

| Case | `ends_at` |
|---|---|
| Tangguh with `newAt` | max(current `ends_at`, `newAt` + 3 h) |
| Tangguh without date | max(current `ends_at`, end of day of `E`, now + 24 h) |
| Batal | max(end of day of `E`, now + 24 h). It may only shorten a later `ends_at` if the AJK confirms ("Tamatkan slaid selepas tarikh asal?" default yes) |

### 3.4 TV rendering
- A **stamp** across the slide: "DITANGGUHKAN" or "DIBATALKAN" (BM, uppercase, ≥ 48 px at 12:5).
- Original date/time shown **struck through**; for Tangguh with `newAt`: "Tarikh baru: Jumaat, 28 Nov · 8:45 malam" emphasised; without: "Tarikh baru akan dimaklumkan".
- Reason line if set.
- Countdown (E-B): Tangguh with `newAt` → counts to `newAt`; Tangguh without date and Batal → no countdown.
- Implemented once as a shared component (`NoticeStamp`) that every theme's kuliah/program/mesyuarat template renders, taking theme tokens. Colours: Tangguh = amber family, Batal = red family, both WCAG AA on every theme surface; in `lite` no shadow/blur. Kematian is never affected.

### 3.5 Standalone template `penangguhan`
For activities never entered as a slide. Fields: tajuk aktiviti (≤ 80), jenis (Tangguh/Batal), tarikh & masa asal, tarikh & masa baru (optional, Tangguh only), penceramah/penganjur (optional, ≤ 60), sebab (optional, ≤ 100), nota (optional, ≤ 140). Renders with the same `NoticeStamp`. Default `ends_at` per §3.3.

## 4. E-B — Activity countdown

### 4.1 Event time
- Templates `kuliah`, `program`, `mesyuarat`. **If the template already has date and time fields, those are the event time** (no new field). If not, add `eventDate` + `eventTime` to its schema. Audit in prompt E1 decides; it must not create a second, conflicting date field.
- Audit result (E1): all three templates already have `date` (display text + `dateIso` "YYYY-MM-DD", written by the editor) and `time` (`time-choice`: one of the "Selepas …" choices or a clock string "8:30 malam"). Event time = `dateIso` + `time`; no new date field. A slide without `dateIso` has no event time (no countdown).
- New boolean field `showCountdown` (default **on** when an event time exists; a missing value counts as on, so existing slides get the countdown).
- Optional `durationMin` (default 90) = how long "Sedang berlangsung" shows.

### 4.2 States (TV computes from its own clock; offline-safe)
| Time to start | Text (BM) |
|---|---|
| ≥ 2 calendar days | "Lagi **3** hari" |
| Tomorrow | "Esok · 8:45 malam" |
| Today, > 60 min | "Hari ini · 8:45 malam" |
| ≤ 60 min | "Bermula dalam **42:15**" (mm:ss, ticks once per second **only while the slide is visible**) |
| Started, within `durationMin` | "Sedang berlangsung" |
| After that | countdown line hidden (slide itself still follows `ends_at`) |

Calendar days are counted in Asia/Kuala_Lumpur. Times follow the masjid's 12h/24h setting. With a Tangguh notice, the target is `newAt` (§3.4).

**Prayer-relative time** ("Selepas Maghrib", D10): only the day-level states are shown, with the choice text in place of a clock time ("Lagi 3 hari", "Esok · Selepas Maghrib", "Hari ini · Selepas Maghrib"). No mm:ss and no "Sedang berlangsung"; the line hides after that day.

### 4.3 Admin
Editor: "Papar kiraan detik" switch under the date/time fields; the live preview shows the state for the current time; a small "Pratonton pada…" picker lets the AJK preview the ≤ 60-min state.

## 5. E-D — Hari kebesaran Islam (slide `hari_kebesaran`)

### 5.1 Events (fixed list)
| key | Hijri date | Label | Greeting on the day | Night before? |
|---|---|---|---|---|
| `awal_muharram` | 1 Muharram | Awal Muharram | Salam Maal Hijrah {year}H | no |
| `maulidur_rasul` | 12 Rabiulawal | Maulidur Rasul | Salam Maulidur Rasul | no |
| `israk_mikraj` | 27 Rejab | Israk dan Mikraj | Israk dan Mikraj | yes |
| `nisfu_syaaban` | 15 Syaaban | Nisfu Syaaban | Malam Nisfu Syaaban | yes |
| `awal_ramadan` | 1 Ramadan | Awal Ramadan | Ramadan Kareem | no |
| `nuzul_quran` | 17 Ramadan | Nuzul Al-Quran | Nuzul Al-Quran | yes |
| `aidilfitri` | 1 Syawal | Hari Raya Aidilfitri | Selamat Hari Raya Aidilfitri | no |
| `hari_arafah` | 9 Zulhijjah | Hari Arafah | Hari Arafah | no |
| `aidiladha` | 10 Zulhijjah | Hari Raya Aidiladha | Selamat Hari Raya Aidiladha | no |

"Night before" = from Maghrib of the previous day the slide says "**Malam ini**" (the masjid programme is that night). Maghrib time comes from the existing engine.

### 5.2 Data
`islamic_events(event_key, hijri_year, greg_date, status 'jangkaan'|'rasmi', note)`; one row per event per Hijri year; edited only by the platform owner (Platform → **Takwim** tab). Any change bumps every active masjid's bundle so TVs pick it up within ~70 s. **No dates are seeded by code**; the owner enters them from JAKIM's takwim.

### 5.3 Slide fields
- `events`: which keys to include (default all 9).
- `leadDays`: start showing an event this many days before (7–365, default 60).
- `showMore`: 0–2 following events shown small (default 2).

### 5.4 What the slide shows (first match wins)
1. **Greeting day**: today is an event date → full greeting (Aidilfitri: 1 and 2 Syawal; others: the day itself).
2. **Malam ini**: after Maghrib on the eve of a "night before" event.
3. **Ramadan**: today is between `awal_ramadan` and the day before `aidilfitri` of the same Hijri year → "Ramadan · Hari ke-**12**" + "Aidilfitri dalam 18 hari".
4. **Countdown**: nearest included event within `leadDays` → big number "**42**", "hari lagi", event name, Hijri date ("1 Ramadan 1448H") and Gregorian date ("Isnin, 8 Feb 2027"); "Esok" when 1 day.
5. Up to `showMore` further events in a small list ("Nuzul Al-Quran · 59 hari").
6. Nothing applies → **slide is skipped** in the playlist (never an empty slide).

Any event with status `jangkaan` shows a small "jangkaan" label. Day counts are calendar days in Asia/Kuala_Lumpur.

### 5.5 Admin
- Template picker: "Hari Kebesaran Islam". Editor: event checklist, lead days, show-more; preview uses the real takwim; a read-only list of loaded dates with "Tarikh daripada takwim JAKIM, dikemas kini oleh Masjid View". If no dates exist for the coming 12 months: notice "Tarikh belum dimuat naik".
- Platform → **Takwim** (platform owner only): table per Hijri year with the 9 events: date, status, note; "Sahkan" quick action (jangkaan → rasmi); add year. Upcoming 3 events highlighted. Warn if the next 365 days have fewer than 9 dated events.

## 6. E-E — Jadual Imam & Bilal (slide `jadual_petugas`)

### 6.1 Data
- `petugas`: name (2–60), title (optional ≤ 20: Ustaz, Ust., Hj., Tuan Hj., Imam …), roles ⊆ {imam, bilal}, active, sort order. Max 40 per masjid. **Names only; no phone numbers** (PDPA).
- `roster_slots`: day (1 = Isnin … 7 = Ahad) × waktu (null = **sepanjang hari**, or subuh/zohor/asar/maghrib/isyak) × role → petugas. Unique per (day, waktu, role).
- **Resolution** for a day + waktu + role: slot for that waktu → else the day's all-day slot → else "—". Friday Zohor is labelled "Jumaat".
- Saved as a whole grid via `roster_save()` (one transaction, one bundle bump).

### 6.2 Admin: new page **Petugas** (`/admin/petugas`, nav item between Kandungan and Skrin)
- **Senarai** tab: add/edit/deactivate/reorder; role checkboxes Imam / Bilal; title with suggestions.
- **Jadual** tab: one card per day (phone) / table with 7 rows (computer): Imam ▾, Bilal ▾ for the whole day; "Tetapkan ikut waktu" expands 5 rows × (Imam ▾, Bilal ▾) where blank = follows the day. Actions: **Salin ke semua hari**, **Salin ke hari bekerja (Isnin–Jumaat)**, **Kosongkan hari**. Unsaved-changes guard. **Simpan** → `roster_save`.
- Dropdowns list only active petugas with that role.
- After the first save, if no `jadual_petugas` slide exists: CTA "Papar di TV" → opens the editor pre-filled.

### 6.3 Slide fields
- `view`: `minggu` (default) | `hari_ini`.
- `title`: default "Jadual Imam & Bilal" (≤ 40).

### 6.4 What the slide shows
- **minggu**: 7 rows Isnin → Ahad; columns Hari | Imam | Bilal (all-day names). **Today highlighted.** A day with per-waktu exceptions shows a small "+ ikut waktu" marker.
- **hari_ini**: today's 5 waktu (Zohor → "Jumaat" on Friday) × Imam | Bilal (resolved), plus a compact "Esok: Imam … · Bilal …" line.
- Names: "title + name"; shrink to fit down to 18 px, then ellipsis. Empty = "—".
- No slots at all → **slide is skipped**.
- Admin editor hint when `minggu` is chosen and per-waktu exceptions exist: "Paparan mingguan menunjukkan petugas harian. Pilih 'Hari ini' untuk papar ikut waktu."

## 7. Templates, playlist and bundle

### 7.1 Template keys
Existing 10 + `penangguhan`, `hari_kebesaran`, `jadual_petugas` = 13 keys. Picker shows 12 (hides `imam_bilal`). All three new templates must exist in **all 7 themes** and adapt to areas `bottom` 12:5, `side` 5:4, `poster` 16:9 (contract rules 14–18). Kematian rules untouched.

### 7.2 Playlist
New "skip" rule: a template may declare `isEmpty(bundle, now)`; empty slides are skipped (E-D §5.4.6, E-E §6.4). If every slide is skipped, the existing empty state shows.

### 7.3 Bundle (`screen_bundle`, status `ok`) — two new keys
```json
"islamicEvents": [ { "key": "awal_ramadan", "hijriYear": 1448, "date": "2027-02-08", "status": "jangkaan" } ],
"roster": { "petugas": [ { "id": "…", "name": "Ahmad Zaki", "title": "Ust.", "roles": ["imam"] } ],
            "slots":   [ { "day": 1, "waktu": null, "role": "imam", "petugasId": "…" } ] }
```
- `islamicEvents`: dates from today − 40 days to today + 400 days (keeps the Ramadan start during Ramadan).
- `roster`: active petugas and their slots only.
- Older TVs ignore the keys. A bundle without them = no events / no roster (slides skipped).
- Cached in IndexedDB like the rest of the bundle.

## 8. E-C — Android TV app

### 8.1 Shape
- Native Kotlin app, one Activity hosting a **WebView** that loads `https://masjidview.my/tv?shell=apk&shellv=<versionName>`. Not a TWA (Google TVs often have no Chrome).
- Package `my.masjidview.tv`, name "Masjid View TV", Leanback launcher entry, **320×180 banner** (Pintu Mihrab logo + name) and icon, touchscreen not required, `minSdk` 24 (older Android TV boxes), current `targetSdk`.
- Two build flavours: **`sideload`** (pilot; self-update + boot start) and **`play`** (later; no self-update permission).

### 8.2 Behaviour
| Need | Implementation |
|---|---|
| Full screen, always on | Immersive mode, `FLAG_KEEP_SCREEN_ON`, no overscan |
| Keep pairing across restarts/updates | DOM storage + IndexedDB on; same package + **same signing key** forever |
| Offline | Service worker works in WebView; if the very first load fails, native offline screen "Tiada sambungan internet" retrying every 30 s |
| Self-healing | Renderer crash → recreate WebView; JS heartbeat (`MasjidViewShell.heartbeat()` every 30 s from `/tv`); none for 3 min → reload |
| Sound | `mediaPlaybackRequiresUserGesture = false`; web hides the speaker-off icon in the app only if audio really is unlocked (test) |
| Remote | D-pad passes to the page; **Back** twice within 2 s exits (toast "Tekan sekali lagi untuk keluar"); **Menu** (or hold OK 3 s) opens native Tetapan |
| Native Tetapan | Muat semula · Buka automatik semasa TV dihidupkan · Semak kemas kini · versi app + web |
| Boot start (sideload) | `BOOT_COMPLETED` receiver; Android 10+ needs "Paparan di atas apl lain" (overlay) permission — Tetapan has a button that opens that screen. Best effort; some Google TVs block it |
| Self-update (sideload) | On start + every 24 h read `https://masjidview.my/apk/latest.json`; if newer: native prompt "Versi baharu tersedia — Kemas kini?"; download, verify SHA-256, open the Android installer (needs "Pasang apl tidak diketahui" for this app) |
| Lock-down | Only `https://masjidview.my` loads in the WebView; other links blocked; no file access; JS bridge exposes only `heartbeat()` and `info()` |

### 8.3 Version reporting
`/tv` reads `shell`/`shellv`, stores them, and sends `app_version` as `<webVersion>+apk<shellv>` (e.g. `2026.11.20+apk1.0.0`). Admin Skrin shows "App TV 1.0.0" or "Pelayar", and "Kemas kini tersedia" when older than `latest.json`.

### 8.4 Build & release (no Android Studio needed)
- Code in `android-tv/` in the same repo. Built by GitHub Actions on tag `tv-v*` (and manual run): signs with a keystore kept in GitHub Secrets (`ANDROID_KEYSTORE_B64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`), builds `sideloadRelease` APK and `playRelease` AAB, attaches both to a GitHub Release, and commits `public/apk/masjidview-tv.apk` + `public/apk/latest.json` (`versionCode`, `versionName`, `sha256`, `bytes`, `date`, `notes`) to `main` → Cloudflare Pages deploys it.
- `public/_redirects`: `/apk  /apk/masjidview-tv.apk  302`. `public/_headers`: `/apk/*` no-cache.
- **Keystore**: generated once on Afiq's PC with `keytool`; never committed (`*.jks` in `.gitignore`); backed up in two places. Losing it means every TV must uninstall, reinstall and **re-pair**.

### 8.5 Admin: "Pasang app di TV"
On **Skrin** (card above the list, collapsible) and in the "Tambah skrin" sheet:
1. Version + size + date from `latest.json`; buttons **Muat turun APK** (for USB) and **Salin pautan**.
2. Steps for the TV (BM/EN): install **Downloader** from the TV's Play Store → allow Downloader to install unknown apps (Tetapan → Privasi/Keselamatan → Apl tidak diketahui; wording varies by TV) → open Downloader, type `masjidview.my/apk` → Install → open "Masjid View TV" → pairing code appears → pair as usual.
3. Note: Fully Kiosk Browser still works; the app is the recommended option.

### 8.6 Risks
- Boot auto-start is not guaranteed on Android 10+ / Google TV.
- Some TVs hide the "unknown apps" setting; Downloader's own prompt usually opens it.
- Android WebView versions on old boxes may lack features; minimum WebView checked on start ("Sila kemas kini Android System WebView").

### 8.7 Phase B — Google Play (not now)
Use the `play` AAB. Needs: Play Console account (US$25 one-time), listing, screenshots, `/privasi`, Data safety form, TV review (Leanback, banner, App Bundle). A **personal** account created after 13 Nov 2023 needs a closed test with 12 testers for 14 continuous days; an **organisation** account (e.g. Alfateh Design with a D-U-N-S number) is exempt. Decide before starting Phase B.

## 9. Database (summary — full SQL in `62-enhancements-migration.sql`)
- `slides.template_key` check: + `penangguhan`, `hari_kebesaran`, `jadual_petugas`.
- `slides` check: `fields.notice` only on kuliah/program/mesyuarat, `kind` ∈ {tangguh, batal}, reason ≤ 100.
- New tables `islamic_events` (RLS: read = signed-in; write = platform owner), `petugas` (RLS: read = members; write = admins of an active masjid), `roster_slots` (RLS: read = members; write only via `roster_save`).
- Triggers: islamic_events change → bump all active masjids; petugas change → bump that masjid; petugas role removed → its slots for that role deleted; roster slot must point to a petugas of the same masjid with that role; max 40 petugas.
- Functions: `roster_save(org, slots)`, `bundle_islamic_events()`, `bundle_roster(org)` (internal); `screen_bundle` gains the two keys (merged into the **latest live** definition, which already has usage telemetry and `screen.sound`).

## 10. Acceptance criteria
1. Tangguh with new date: TV shows stamp, struck-through old date, new date, reason, and counts down to the new date within ~70 s of saving (~130 s at night, when TVs sync every 120 s). Tangguh without date and Batal: no countdown. Tarik balik restores the normal slide and the old priority.
2. Notice cannot be saved on any template other than kuliah/program/mesyuarat (DB rejects); reason > 100 chars rejected.
3. `penangguhan` template renders in 7 themes × 3 areas with no clipped text; Kematian unchanged.
4. Countdown states follow §4.2 with `?sim=` at: 3 days before, the day before, 2 h before, 59:30 before, 10 min after start, 2 h after start. The mm:ss only ticks while the slide is visible; offline 48 h still correct.
5. Hari kebesaran: with test dates, `?sim=` shows countdown, "Esok", "Malam ini" after Maghrib (Nisfu Syaaban), greeting on the day (Aidilfitri day 1 and 2), Ramadan "Hari ke-N"; slide skipped when nothing is within `leadDays`; "jangkaan" label shows until confirmed; a takwim change reaches the TV within ~70 s (~130 s at night).
6. Roster: all-day + per-waktu resolution correct for every day (unit tests); Friday Zohor labelled Jumaat; `minggu` highlights today; `hari_ini` shows resolved names; slide skipped with no slots; deactivating a petugas removes them from the TV; removing a role deletes their slots for that role.
7. RLS: masjid A cannot read or write masjid B's petugas/roster; non-owners cannot write `islamic_events`; `roster_save` rejects other masjids, inactive masjids, foreign petugas, wrong role, > 100 slots.
8. Android app: installs via Downloader from `masjidview.my/apk` on the pilot Google TV; shows pairing, pairs, runs full screen 24 h without sleeping; survives Wi-Fi off 10 min; renderer kill → recovers; Back-Back exits; pairing survives app update; admin shows "App TV x.y.z"; self-update installs a higher version after confirmation.
9. Admin: all new pages/sheets in BM and EN, usable at 360 px and on a computer at 1280×800, tap targets ≥ 44 px.
10. A TV on the previous app version keeps working against the migrated database.

## 11. Later
Play Store listing (Phase B) · date-specific gantian for imam/bilal · khatib Jumaat / imam tarawih roles · roster text in the prayer area of themes · custom Islamic events per masjid · automatic takwim import.
