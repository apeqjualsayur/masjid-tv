# Phase 1 Test Plan (v0.1)

Covers the acceptance criteria in `00-PRD.md` §12, plus the non-functional checks in §11 that the pilot depends on.
Each criterion lists what is automated, what must be checked by a person, and how to tell pass from fail.

**Last full run: 2026-10-18.** Unit tests 262/262 pass. Browser checks (`npm run e2e`) 7/7 pass. Manual checks on the pilot TV not yet done.

---

## 1. How to run the automated tests

| What | Command | Time | Notes |
|---|---|---|---|
| Unit tests (engine, data, themes, service worker) | `npm test` | ~2 s | No network, no browser |
| Type check | `npm run lint` | ~10 s | |
| Browser acceptance checks | `npm run build` then `npm run e2e` | ~4 min | Needs Google Chrome (set `CHROME_PATH` if it is not found). Writes screenshots and `report.md` to `e2e-output/` |
| One browser check only | `E2E_ONLY=12.5 npm run e2e` | | Comma-separate several ids |

The browser checks serve the real static build on `http://127.0.0.1:4321`, where debug URL parameters work without `?debug=1`.

**Test data:** real JAKIM times for zone SGR01, October 2026 (bundled in `public/data/SGR01-2026.json`). On Saturday 17 Oct 2026: Imsak 5:40, Subuh 5:50, Syuruk 6:56, **Zohor 1:01**, Asar 4:18, Maghrib 7:01, Isyak 8:11. Friday 16 Oct: Zohor 1:02.

> The PRD §12.1 example says "13:04:00 → PRE_AZAN", which assumed Zohor at about 13:05. With the real data Zohor is 13:01, so every test starts the simulation 4 minutes before the real Zohor (12:57) instead.

---

## 2. Acceptance criteria (PRD §12)

### 12.1 Weekday Zohor sequence

**Requirement:** at Zohor − 4 min on a weekday the screen shows the PRE_AZAN banner; at Zohor it switches to AZAN, then IQAMAH counting down from the configured minutes, then SOLAT, then NORMAL with Asar as next.

| Type | Where | Result |
|---|---|---|
| Unit | `src/core/modes.test.ts` "weekday sequence around Zohor" (every second from 12:50 to 13:40; exact switch times 12:56 / 13:01 / 13:04 / 13:14 / 13:26) | PASS |
| Unit | `src/core/acceptance.test.ts` "PRD 12.1" (simulated clock at 10×, iqamah starts at 600 s, Asar next at the end) | PASS |
| Browser | e2e `12.1`: `/tv/?debug=state&sim=2026-10-17T12:57:30&speed=60` in Chrome | PASS: pre_azan > azan > iqamah > solat > normal |
| Manual | Open `/tv/?sim=2026-10-17T12:57:30&speed=20&debug=1` with each theme (`&theme=alam`, `serambi`, `tenang`) and watch the screens | To do |

**Pass if** the five screens appear in that order, the iqamah countdown starts at 10:00, and after solat the normal screen shows Asar as next.

### 12.2 Friday

**Requirement:** on Friday, Zohor is labelled Jumaat and goes AZAN → KHUTBAH → SOLAT (no iqamah countdown).

| Type | Where | Result |
|---|---|---|
| Unit | `modes.test.ts` "Friday Zohor" (khutbah 40 min, other Friday prayers still have iqamah) | PASS |
| Unit | `acceptance.test.ts` "PRD 12.2"; `schedule.test.ts` "Friday" (Jumaat / جمعة label, `day=fri` override) | PASS |
| Browser | e2e `12.2`: `/tv/?debug=state&sim=2026-10-16T12:59:00&speed=60` | PASS: pre_azan > azan > khutbah > solat > normal |
| Manual | `/tv/?sim=2026-10-16T12:58:00&speed=20&debug=1` per theme; also `&day=fri` on any day | To do |

### 12.3 Between Syuruk and Zohor

**Requirement:** no "Sekarang" highlight; Zohor shows as next.

| Type | Where | Result |
|---|---|---|
| Unit | `acceptance.test.ts` "PRD 12.3" (checked every minute from Syuruk to Zohor); theme tests in `src/themes/*.test.tsx` ("no Sekarang / SEKARANG between Syuruk and Zohor") | PASS |
| Browser | e2e `12.3`: 09:00 in the debug view and in all 3 themes | PASS |

### 12.4 All themes × layouts at 1080p; current vs next readable from 5 m

| Type | Where | Result |
|---|---|---|
| Unit | Every theme renders every layout, screen and all 10 templates (`themes.test.tsx`, `serambi.test.tsx`, `alam.test.tsx`); contract rules: current differs from next in fill **and** weight, Arabic marked `lang="ar" dir="rtl"`, Kematian without accent colours. Time-size minimums are asserted for Alam (56 / 54 / 44 px); Tenang (62 / 54 / 58) and Serambi (78 / 62 / 62) use the design sizes, which are above the minimums | PASS |
| Browser | e2e `12.4`: 9 combinations at 1920×1080, stage exactly 1920×1080, all 7 times visible, no error screen. Screenshots: `e2e-output/12.4-<theme>-<layout>.png` | PASS |
| Manual | **On the pilot TV**, from 5 m in the prayer hall: for each theme, can a jemaah tell which waktu is current and which is next? Check in daylight and at night (Isyak palette). Record TV size and distance | To do |

**Pass if** three people standing 5 m away all identify the current and next waktu correctly in every theme.

### 12.5 Offline for 48 h

**Requirement:** with WiFi off for 48 h (simulated with `sim` + offline), times are still correct from cache or the bundled fallback.

| Type | Where | Result |
|---|---|---|
| Unit | `src/data/offline.test.ts`: online, offline with cache, offline without cache (bundled file), corrupted cache (5 kinds), IndexedDB unavailable, no data at all → "Data waktu tidak tersedia" | PASS |
| Unit | `scripts/sw.test.ts`: service worker precache, page/asset/data/config/poster/API strategies online and offline; `/chrono` never cached | PASS |
| Browser | e2e `12.5`: visit once online (service worker installs, data "live"); then **stop the server and block DNS** and open a second browser session on the same profile | PASS: today **cache**, +48 h **cache**, 1 Dec **fallback**, Jan 2027 **tidak tersedia** |
| Manual | On the pilot TV: load once with WiFi, then switch the router off. Reload the page (or restart the TV). Check the times against the JAKIM e-Solat website. Leave it off for 48 h and check again. With `?debug=1` the status overlay should say "Sumber data: cache" | To do |
| Manual | Chrome DevTools → Network → Offline, reload: the screen still works and the overlay shows `cache` or `fallback` | To do |

**Pass if** the screen keeps showing correct times with no network, and shows "Data waktu tidak tersedia" (not wrong times) only when no data exists for the date.

### 12.6 Phase palette changes at the §4 boundaries

| Type | Where | Result |
|---|---|---|
| Unit | `acceptance.test.ts` "PRD 12.6": a full day second by second gives exactly 6 phase changes, on the boundary seconds | PASS |
| Unit | Theme tests: each theme uses the token colours of the current phase; Alam's 60 s cross-fade logic (`alam.test.tsx`) | PASS |
| Browser | e2e `12.6`: 10 samples just before / after each boundary; Alam scene switches subuh → zohor | PASS |
| Manual | Watch Alam at Imsak and Syuruk: `/tv/?theme=alam&sim=2026-10-17T06:55:50` — the landscape should fade to the Zohor palette over 60 s | To do |

### 12.7 Clock offset from /chrono applied

**Requirement:** set the device clock 3 minutes wrong; the screen still shows the right time.

| Type | Where | Result |
|---|---|---|
| Unit | `src/core/time.test.ts` (offset applied, sim ignores it); `src/data/api.test.ts` (offset = server − device, device 3 min slow); `src/data/cache.test.ts` (re-sync every 30 min, stored offset restored on boot) | PASS |
| Browser | e2e `12.7`: the `/chrono` answer is replaced with server time + 3 min; overlay shows offset ≈ +180 s and the clock is 3 min ahead of the device | PASS (+179.7 s) |
| Manual | On the pilot TV: set the TV clock 3 min fast (automatic time off), reload with WiFi. The screen should match a phone clock. `?debug=1` shows "Offset jam: −180 s" | To do |

### 12.8 Seven days unattended on the pilot TV

Manual only.

1. Install per `04-pilot-setup.md` (Prompt 11). Configure the real masjid in `public/config/screen.json` (name, zone, iqamah minutes confirmed with the AJK).
2. Note the start date and time. Do not touch the TV for 7 days.
3. Each day, someone at the masjid checks (photo of the screen is enough):
   - times match JAKIM e-Solat;
   - the clock matches a phone;
   - azan / iqamah / solat screens appeared at each prayer (ask the bilal);
   - the screen did not freeze, go black, or show "Ralat paparan" for long.
4. On day 7 open `?debug=1` once and record: data source, last data sync, last clock sync, service worker version.

**Pass if** all 7 daily checks are clean. Record any problem with date, time, and a photo.

| Day | Date | Times OK | Clock OK | Modes OK | Notes |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |
| 4 | | | | | |
| 5 | | | | | |
| 6 | | | | | |
| 7 | | | | | |

---

## 3. Other checks the pilot depends on (PRD §11)

| Area | Automated | Manual |
|---|---|---|
| Scaling to any 16:9 screen, letterbox others | Stage scale logic used by e2e at 1920×1080 | Open on 1280×720 and 3840×2160 (or browser zoom); a non-16:9 window shows black bars, nothing cut off |
| Burn-in shift 0–4 px every 10 min | `stage-utils.test.ts` (range, all 25 positions, changes every slot) | — |
| Daily reload at 03:00 | — | Uses the real clock (not `sim`). Leave the TV on overnight; with `?debug=1` the "Data sync" time resets after 03:00 because the page reloaded |
| Error recovery | — | A display crash shows "Ralat paparan" and reloads after 30 s |
| Lite mode | Theme tests (no blur, glows, shadows; layout unchanged). A browser run during development confirmed no slide cross-fade in lite | On the pilot TV check the overlay "Lite": auto turns on if the TV is slow. If animations stutter, use `?lite=1` |
| Slides playlist | `src/core/playlist.test.ts` (15 s default, per-slide duration, expiry, days of week, priority ×2, counter); `src/data/slides.test.ts` | `/tv/?theme=serambi&layout=side` cycles 12 slides, "n / 12" counter, smooth 600 ms fade |
| Readability: smallest text ≥ 18 px, times ≥ 54 px | Alam time sizes asserted; others by design | Spot-check with a 1080p screenshot |
| PWA install | e2e checks the manifest link | Fully Kiosk / Chrome shows the app full-screen, landscape |

---

## 4. Debug status overlay

Open any screen with `?debug=1`. The bar at the bottom shows:

| Field | Meaning |
|---|---|
| Sumber data | `live` fetched this session · `cache` IndexedDB from an earlier session · `fallback` bundled yearly file · `tiada` no data |
| Data sync | When the months on screen were fetched from the API |
| Jam sync | Last successful clock sync; orange dot if more than 24 h ago |
| Offset jam | Server time minus TV clock |
| Lite | on/off and whether forced (`?lite=`) or automatic |
| Versi | App version and build time |
| Service worker | `aktif · <cache version>` when offline support is installed |
| Rangkaian | Browser online/offline flag |
| Konfigurasi | Where screen.json came from: `network`, `sw-cache` (offline copy), `saved`, `default` |

---

## 5. Known gaps and risks

1. **2027 prayer data is not published yet.** Run `npm run fetch-year -- <ZONE> 2027` and redeploy once JAKIM publishes it, before 31 Dec 2026. Without it the screen shows "Data waktu tidak tersedia" from 1 Jan 2027 if the TV is offline.
2. **Pilot zone and iqamah minutes** are placeholders (SGR01, PRD §13). Confirm with the AJK.
3. **Clock offset storage** uses `localStorage`. It is written every 30 min; a power cut right after a sync could lose only the newest value, and the previous one is still used.
4. **"Rangkaian" uses the browser's online flag**, which reports the WiFi link, not whether the internet works. Trust "Sumber data" and "Data sync" instead.
5. Current/next readability at 5 m, the 03:00 reload, and the 7-day run can only be checked on the pilot TV.