# Masjid View — Enhancements: step-by-step prompts (E0–E17)

Adds: activity notices (Tangguh / Batal), activity countdown, the Android TV app (sideloaded APK), Hari Kebesaran countdown slide, and the Imam & Bilal roster slide.
Spec: `_specs/60-PRD-enhancements.md` · SQL: `_specs/62-enhancements-migration.sql`.

**How to use:** open the `masjid-tv` folder in VS Code → Terminal → `claude`. Paste **one prompt at a time**. Do its **Check**, then commit (`git add -A && git commit -m "E4 done"`). Start each prompt in a fresh conversation (`/clear`) so it re-reads the specs. If Claude Code shows a plan or asks a question, answer before it continues. If a check fails, paste the error back and ask for a fix.

Everything runs on **masjidview-dev** until E17.

| Sprint | Step | Who | What |
|---|---|---|---|
| — | E0 | You | Branch, copy specs, signing key |
| — | E1 | Claude | Audit + spec check (no code) |
| — | E2 | Claude | Database migration (dev) + RLS checks |
| — | E3 | Claude | TV data + pure logic (events, roster, countdown, skip rule) |
| 1 | E4 | Claude | TV: notice stamp, countdown, Penangguhan template (7 themes) |
| 1 | E5 | Claude | Admin: Tangguh / Batal, countdown fields, Penangguhan editor |
| 1 | E6 | Claude | Android TV app (WebView shell) |
| 1 | E7 | Claude | GitHub Actions build + `masjidview.my/apk` |
| 1 | E8 | Claude | Web side of the app: version, heartbeat; admin "Install on TV" card |
| 1 | E9 | You | Test sprint 1 on the pilot TV |
| 2 | E10 | Claude | TV: Hari Kebesaran template (7 themes) |
| 2 | E11 | Claude | Admin: Hari Kebesaran editor + Platform → Takwim |
| 2 | E12 | You | Enter takwim dates, test |
| 3 | E13 | Claude | Admin: Petugas page (list + roster grid) |
| 3 | E14 | Claude | TV: Jadual Imam & Bilal template (7 themes) |
| 3 | E15 | Claude | Admin: Jadual Imam & Bilal editor; hide old `imam_bilal` |
| 3 | E16 | You | Test sprint 3 on real TVs |
| — | E17 | Claude + you | Production rollout |

---

## E0 — You: preparation (about 30 minutes)

1. Copy `60-PRD-enhancements.md`, `61-enhancements-prompts.md`, `62-enhancements-migration.sql` from the Project into `masjid-tv/_specs/`.
2. Terminal: `git checkout -b enhancements` then `git add -A && git commit -m "specs: enhancements"`.
3. Get the **Hijri takwim** for the next 12–15 months from JAKIM (dates for the 9 events in PRD §5.1). Keep it in a note; you enter it in E12. Do not let Claude Code guess dates.
4. Make the **app banner**: 320×180 px PNG with the Pintu Mihrab logo + "Masjid View" on the brand green, and a 512×512 icon. Save both in `masjid-tv/designs/android/` (`banner.png`, `icon.png`).
5. The **signing key** is created in E6, on your PC. Decide now where you will keep two backups (for example your password manager + a USB drive kept at home). Losing it means every masjid has to reinstall the app and pair again.

---

## E1 — Audit and spec check (no code)

```
Read AGENTS.md, then _specs/60-PRD-enhancements.md, _specs/62-enhancements-migration.sql, _specs/01-theme-contract.md, and the code for: src/templates (all field schemas), the playlist logic in src/core, src/data/bundle.ts, how a theme renders a template (one theme is enough, e.g. tenang), the admin template editor, the Kandungan list, and the Platform page. Also find the LATEST definition of screen_bundle across supabase/migrations/ (it has usage telemetry and screen.sound). Do NOT change code in this step.
Report:
1. For kuliah, program and mesyuarat: which fields already hold the event date and time (names, types, formats). Propose how PRD §4.1 maps onto them without adding a second date field. If a template has no time field, propose the new field.
2. Where a shared NoticeStamp component should live so all 7 themes can use it while keeping theme folders styling-only. Propose its props (kind, original time, new time, reason, theme tokens, area, lite).
3. How to add an isEmpty(bundle, now) skip rule to the playlist with the smallest change, and which tests exist for the playlist today.
4. How the bundle cache in IndexedDB is versioned, and what happens to an older cached bundle that lacks islamicEvents/roster.
5. The exact screen_bundle definition you will merge in E2 (file name + the jsonb_build_object block), and the name of the template_key check constraint in the live schema.
6. Anything in the PRD that contradicts the code or the other specs (stop and ask, do not guess).
7. Proposed edits to AGENTS.md: new template keys; new folder android-tv/ (Kotlin, not part of the Next.js build); new debug params if any (e.g. shell=apk); rule "the TV computes countdowns and roster from the bundle, never from a fetch".
8. Proposed edits to _specs/01-theme-contract.md for the 3 new templates and NoticeStamp.
Show me the report and the two diffs, and wait for my OK before saving the doc edits.
```
**Check:** the report names the real date/time fields of kuliah/program/mesyuarat and shows the live screen_bundle file. Read the contract diff once. Reply "OK, save". Commit.

---

## E2 — Database migration (dev)

```
Read _specs/62-enhancements-migration.sql and _specs/60-PRD-enhancements.md §7.3 and §9.
1. Create the next numbered migration supabase/migrations/NNNN_enhancements.sql from the spec file. In section 7, merge the two new keys ('islamicEvents', 'roster') into a copy of the LATEST screen_bundle definition you found in E1. Change nothing else in screen_bundle (keep usage telemetry, screen.sound, the 'unchanged' path). If the template_key constraint has a different name in the live schema, use the live name. Explain the migration in plain words and show it to me. Do not apply yet.
2. Extend scripts/rls-check.ts (same PASS/FAIL style):
   - notice: accepted on kuliah; rejected on pengumuman; batal with newAt rejected; reason of 101 chars rejected;
   - the 3 new template keys are accepted;
   - islamic_events: a masjid admin cannot insert; the platform owner can; every active masjid's bundle_version goes up, pending ones do not;
   - petugas: admin A can add to A, not to B; B cannot read A's petugas; the 41st petugas is rejected; a pending masjid cannot add;
   - roster_save: saves; rejects another masjid; rejects a petugas without that role; rejects a duplicate slot and keeps the previous grid; direct insert into roster_slots is rejected;
   - removing the imam role from a petugas deletes their imam slots; a deactivated petugas disappears from the bundle;
   - screen_bundle returns islamicEvents and roster; the 'unchanged' reply does not include them;
   - cleanup at the end even on failure.
3. After I approve, tell me step by step how to apply it to masjidview-dev only (ask whether I prefer the SQL editor or `supabase db push`), then run `npm run rls-check`.
Do not touch masjidview-prod.
```
**Check (dev SQL editor):** `select public.bundle_islamic_events();` returns `[]`. `npm run rls-check` is all PASS. Tip: the migration was already tested on a local Postgres 16 copy of the schema (29 checks), so failures here most likely come from the screen_bundle merge.

---

## E3 — TV data and pure logic

```
Implement the data and logic half of PRD §4, §5.4, §6.1, §6.4, §7. No UI in this step.
1. src/data/bundle.ts: parse and validate islamicEvents (known keys only, valid dates, status jangkaan|rasmi) and roster (petugas with id/name/title/roles; slots with day 1–7, waktu null or one of the 5, role imam|bilal, petugasId that exists). Drop invalid entries, never throw. A bundle without the keys = empty arrays. Keep them in the cached bundle.
2. src/core (pure TS, time only via now(), Asia/Kuala_Lumpur calendar days):
   - activityCountdown(eventAt, durationMin, now, notice) → state per PRD §4.2 (days | tomorrow | today | minutes{mm,ss} | ongoing | none). With a tangguh notice and newAt it targets newAt; tangguh without date and batal → none.
   - islamicEventsView(events, slideFields, now, maghribTodayTime) → one of greeting | malamIni | ramadan{day, aidilfitriInDays} | countdown{event, days} | empty, plus up to showMore following events; hijri label from the fixed table in PRD §5.1; jangkaan flag.
   - resolveRoster(roster, date, waktu?) and weekRoster(roster) per PRD §6.1 (waktu slot overrides the all-day slot; Friday zohor labelled jumaat; inactive/missing = null) and a hasWaktuExceptions(day) helper.
   - Playlist: optional isEmpty(bundle, now) per template; empty slides skipped; if all are skipped, existing empty state.
3. Vitest for every function: every countdown boundary in PRD acceptance 4 (incl. midnight and 12h/24h), Ramadan day 1 and day 30, Aidilfitri day 2 greeting, Nisfu Syaaban before and after Maghrib on the eve, jangkaan flag, leadDays limit, nothing in range → empty; roster all-day vs waktu override, Friday, empty grid; invalid bundle entries dropped.
Do not touch themes, admin or the database. Run npm test and npm run build and paste the summary lines.
```
**Check:** `npm test` passes; skim the test names against PRD §4.2, §5.4 and §6.4.

---

## E4 — TV: notice stamp, countdown, Penangguhan template (all 7 themes)

```
Implement PRD §3.4, §3.5 and §4.2 on the TV, per the contract edits saved in E1.
1. NoticeStamp shared component (location agreed in E1): DITANGGUHKAN (amber family) / DIBATALKAN (red family), original date struck through, new date or "Tarikh baru akan dimaklumkan", reason line. WCAG AA on every theme surface; no shadow/blur in lite; ≥ 48 px stamp text at 12:5.
2. Countdown line in kuliah, program and mesyuarat for all 7 themes, using activityCountdown from E3. mm:ss ticks once a second only while the slide is visible (no timers when hidden). Respect the 12h/24h setting.
3. New template penangguhan in all 7 themes, areas bottom 12:5, side 5:4, poster 16:9; uses NoticeStamp; sample data in src/templates.
4. Kematian unchanged.
5. Playwright screenshots at 1920×1080 into designs/qa/notice/ (git-ignored): 7 themes × 3 areas for (kuliah + tangguh with date), (program + batal), (penangguhan), (kuliah with the ≤ 60 min countdown). Do NOT run playwright install.
Run npm test and npm run build.
```
**Check:** look through the screenshots: is the stamp readable from across a room, any clipped text? Open `/tv?debug=1&local=1&sim=<59 minutes before a sample kuliah>`: the countdown ticks; after the slide changes, nothing keeps ticking (Chrome Performance tab is quiet).

---

## E5 — Admin: Tangguh / Batal, countdown fields, Penangguhan editor

```
Implement PRD §3.2, §3.3, §3.5 (admin) and §4.3, mobile-first (390 px) and computer (≥ 1024 px), using existing components, tokens and i18n (ms.json + en.json).
1. Kandungan row menu (⋯) and editor top bar for kuliah/program/mesyuarat: Tangguhkan…, Batalkan…; when a notice exists: Kemas kini notis, Tarik balik notis.
2. Tangguh sheet / Batal sheet exactly as PRD §3.2, with live preview (same components as the TV). On confirm, apply the priority and ends_at rules of §3.3 (write the ends_at calculation as a pure tested function in src/templates). Batal that would shorten a later ends_at asks first. A paused slide shows the hint from §3.2.
3. Tarik balik: remove notice, restore priority from prevPriority, keep ends_at, show "Semak tarikh tamat slaid".
4. Kandungan list: a small Ditangguhkan/Dibatalkan badge on affected rows.
5. Editor for kuliah/program/mesyuarat: "Papar kiraan detik" switch (default on when a date+time exists) and optional duration; "Pratonton pada…" time picker for the preview.
6. Template picker: add "Penangguhan" with its editor (fields PRD §3.5, validation, preview, default ends_at).
7. Vitest for the ends_at rules (all 3 cases + the confirm case) and the notice field validation.
Run npm test and npm run build.
```
**Check (dev data):** postpone a kuliah to next Friday with a reason → the TV paired to dev shows the stamp within ~70 s and counts down to the new date; Tarik balik → normal slide again; try saving a reason of 101 characters → blocked with a clear message. Repeat once on a phone-width window.

---

## E6 — Android TV app (WebView shell)

```
Create the Android TV app in a new folder android-tv/ per PRD §8.1–§8.3. It is NOT part of the Next.js build (exclude it from tsconfig, lint and the Pages build).
1. Kotlin, Gradle (Kotlin DSL), one Activity with a WebView. Package my.masjidview.tv, label "Masjid View TV". minSdk 24, the current targetSdk. Leanback launcher intent filter, android:banner from designs/android/banner.png (320×180, drawable-xhdpi) and icon from designs/android/icon.png; uses-feature leanback required=false and touchscreen required=false. 64-bit and 16 KB page size safe (no native libs).
2. Flavours: sideload (self-update + boot start) and play (neither; no REQUEST_INSTALL_PACKAGES, no boot receiver).
3. WebView: loads https://masjidview.my/tv?shell=apk&shellv=<versionName> (a debug build may point to a URL from local.properties); JavaScript, DOM storage, IndexedDB and service workers on; mediaPlaybackRequiresUserGesture=false; only https://masjidview.my may load, everything else blocked; no file access; JS bridge "MasjidViewShell" with only heartbeat() and info() (returns versionName, versionCode, flavour, WebView version).
4. Behaviour per PRD §8.2: immersive full screen, FLAG_KEEP_SCREEN_ON; first-load failure → native offline screen in BM retrying every 30 s; onRenderProcessGone → recreate WebView; no heartbeat for 3 minutes → reload; Back twice within 2 s exits with the toast; Menu key or holding OK 3 s opens a native Tetapan screen (Muat semula, Buka automatik semasa TV dihidupkan, Semak kemas kini, versions). Minimum WebView check with a BM message.
5. sideload only: BOOT_COMPLETED receiver that starts the Activity when the user turned the option on; on Android 10+ the Tetapan screen offers a button to the "Display over other apps" settings page and explains why. Self-update: read https://masjidview.my/apk/latest.json on start and every 24 h; if versionCode is higher, native prompt; download to app cache, verify sha256, open the installer through a FileProvider; handle "install unknown apps" not allowed with a BM explanation.
6. Signing: read the keystore path and passwords from environment variables or a git-ignored keystore.properties; add *.jks, *.keystore, keystore.properties to .gitignore. Then give me the exact keytool command to create my upload/signing key on my PC (I type the passwords myself; never write them in any file you create), and tell me what to back up.
7. A short android-tv/README.md for a non-coder: what each file is, how versions are numbered (versionCode +1 every release).
I do not have Android Studio. If you can build locally with the Gradle wrapper, do it; otherwise say so; E7 builds it in GitHub Actions.
```
**Check:** the folder exists, `.gitignore` covers the key files, and you have created the keystore with the command shown. Store it in your two backup places now.

---

## E7 — Build in GitHub Actions + `masjidview.my/apk`

```
Implement PRD §8.4.
1. .github/workflows/android-tv.yml: runs on tag tv-v* and manual dispatch; JDK 17; caches Gradle; decodes ANDROID_KEYSTORE_B64 into a temp file; builds sideloadRelease APK and playRelease AAB, signed with ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD; computes sha256 and size; creates a GitHub Release with both files; then commits public/apk/masjidview-tv.apk (always this name, replaced) and public/apk/latest.json {versionCode, versionName, sha256, bytes, date, notes} to main with message "apk <versionName>". Never print secrets.
2. public/_redirects: /apk → /apk/masjidview-tv.apk (302). public/_headers: /apk/* Cache-Control no-cache. Check the Cloudflare Pages per-file size limit and make the workflow fail if the APK is larger.
3. Tell me step by step: how to base64 my keystore on Windows, which 4 GitHub Secrets to add and where, how to create the first tag (tv-v1.0.0) and where to watch the run.
```
**Check:** the workflow run is green; the Release has the APK and AAB; after the Pages deploy, opening `https://masjidview.my/apk` on your phone downloads `masjidview-tv.apk`, and `https://masjidview.my/apk/latest.json` shows version 1.0.0.

---

## E8 — Web side of the app + admin "Install on TV" card

```
Implement PRD §8.3 and §8.5.
1. /tv: read shell and shellv from the URL, remember them, and send app_version as <webVersion>+apk<shellv>. Every 30 s call window.MasjidViewShell?.heartbeat() if it exists. Hide the sound unlock icon in the app only when the AudioContext really is running.
2. Admin Skrin: per screen show "App TV x.y.z" or "Pelayar" from app_version, and "Kemas kini tersedia" when older than /apk/latest.json.
3. "Pasang app di TV" card on Skrin (collapsible, remembered per browser) and in the Tambah skrin sheet, per PRD §8.5: version, size, date; Muat turun APK; Salin pautan (masjidview.my/apk); the numbered steps in BM/EN; the Fully Kiosk note. If latest.json cannot be loaded, show the steps without version info.
4. i18n strings, unit tests for the app_version parse/compare. Run npm test and npm run build.
```
**Check:** on a computer, the card shows version 1.0.0 and the download works. Open `/tv?shell=apk&shellv=1.0.0` in a browser paired to dev → within ~70 s Skrin shows "App TV 1.0.0" for that screen.

---

## E9 — You: test sprint 1 (about 1 hour)

1. **Install** on the pilot Google TV: Play Store → install **Downloader** → allow it to install unknown apps → type `masjidview.my/apk` → Install → open Masjid View TV. Note every screen where the wording on your TV differs from the admin steps, and send the differences to Claude to fix the instructions.
2. **Pair** with dev (or prod later). Leave it for 2 hours: the screen must not sleep.
3. **Remote:** Back once → toast; Back twice → exits. Menu → Tetapan opens.
4. **Offline:** unplug Wi-Fi for 10 minutes → keeps running; plug back → new content within ~70 s.
5. **Reboot** the TV with "Buka automatik" on. Note whether it starts by itself (best effort).
6. **Update:** bump the version (ask Claude: "Bump android-tv to 1.0.1, change nothing else") → tag `tv-v1.0.1` → within 24 h (or Tetapan → Semak kemas kini) the TV offers the update → install → **still paired**.
7. **Notices:** postpone and cancel a kuliah from your phone; read it from 5 m away.
8. **Sound** (if you use it): does it play without pressing a key in the app?

Merge nothing yet; continue with sprint 2 on the same branch.

---

## E10 — TV: Hari Kebesaran template (all 7 themes)

```
Implement PRD §5.1, §5.3, §5.4 on the TV using islamicEventsView from E3.
1. New template hari_kebesaran in all 7 themes, areas bottom 12:5, side 5:4, poster 16:9: big day number + "hari lagi" / "Esok"; event name; Hijri date ("1 Ramadan 1448H") and Gregorian date in BM ("Isnin, 8 Feb 2027"); "jangkaan" label; up to showMore following events in a small list; greeting state; "Malam ini" state; Ramadan state ("Ramadan · Hari ke-12" + "Aidilfitri dalam 18 hari"). Respectful, calm visuals; no decoration in lite beyond the theme's normal look.
2. isEmpty → skipped when islamicEventsView is empty.
3. Sample data in src/templates for the debug/local mode, clearly marked as sample dates (not real takwim).
4. Playwright screenshots into designs/qa/kebesaran/: 7 themes × 3 areas × (countdown, Esok, greeting Aidilfitri, Malam ini, Ramadan). Do NOT run playwright install.
Run npm test and npm run build.
```
**Check:** screenshots: long names ("Hari Raya Aidiladha", "Israk dan Mikraj") fit in the side 5:4 area of every theme; Arabic is not used unless the theme already shows it.

---

## E11 — Admin: Hari Kebesaran editor + Platform → Takwim

```
Implement PRD §5.5.
1. Template picker: "Hari Kebesaran Islam". Editor: event checklist (default all 9), leadDays (7–365, default 60), showMore (0–2), live preview from the real islamic_events table, read-only list of loaded dates with the source note, and the "Tarikh belum dimuat naik" notice when the next 12 months are empty.
2. Platform page (platform owner only): new tab Takwim. Table per Hijri year with the 9 events: date, status (Jangkaan/Rasmi), note; Sahkan quick action; add year; the next 3 events highlighted; warning when fewer than 9 events are dated in the next 365 days. Writes go straight to islamic_events (RLS allows only the owner). Desktop table, phone cards.
3. i18n, tests for the form validation (one row per event per year, date required to save a row). Run npm test and npm run build.
```
**Check:** as the platform owner, the Takwim tab saves a row; as a normal masjid admin the tab is not visible, and a direct write is refused (the rls-check already covers it).

---

## E12 — You: enter the takwim and test (about 30 minutes)

1. Platform → Takwim: enter the dates you collected in E0 for the next 12–15 months. Mark Ramadan and Syawal as **Jangkaan**.
2. Add a Hari Kebesaran slide to your dev masjid. On the dev TV it appears within ~70 s.
3. With `?debug=1&sim=…` check: 3 days before Awal Ramadan, the day before ("Esok"), the eve of Nisfu Syaaban before and after Maghrib, 1 Ramadan, 12 Ramadan, 1 and 2 Syawal.
4. Change one date → the TV updates within ~70 s.
5. **Every year:** when JAKIM announces Ramadan and Syawal, open Takwim and press **Sahkan** (and fix the date if it moved). Put a reminder in your calendar.

---

## E13 — Admin: Petugas page

```
Implement PRD §6.2, mobile-first and computer layouts, existing components, i18n.
1. New nav item "Petugas" (between Kandungan and Skrin) → /admin/petugas with tabs Senarai and Jadual.
2. Senarai: add/edit name (2–60) and title (suggestions Ustaz, Ust., Hj., Tuan Hj., Imam; free text ≤ 20), roles Imam/Bilal (at least one), active switch, drag to reorder (sort_order). Show the 40-person limit. Removing a role warns: "Jadual untuk peranan ini akan dikosongkan."
3. Jadual: 7 day cards on phone, a 7-row table on computer. Per day: Imam ▾ and Bilal ▾ (sepanjang hari); "Tetapkan ikut waktu" expands 5 rows (Subuh … Isyak; Zohor shown as "Zohor / Jumaat" on Jumaat) where blank = follows the day. Dropdowns list only active petugas with that role. Actions: Salin ke semua hari, Salin ke hari bekerja (Isnin–Jumaat), Kosongkan hari. Unsaved-changes guard. Simpan calls roster_save once with the whole grid.
4. After the first successful save, if there is no jadual_petugas slide: CTA "Papar di TV" → template editor (E15) pre-filled.
5. Errors from the database (petugas_full, bad_petugas, not_allowed) shown as clear BM/EN messages.
6. Unit tests for grid → roster_save payload (and back), including per-waktu exceptions. Run npm test and npm run build.
```
**Check (dev):** add 3 imams and 2 bilals; fill Isnin–Jumaat with "Salin ke hari bekerja"; set a different Isyak imam on Khamis; save; reload: the grid comes back the same. In the dev SQL editor `select count(*) from roster_slots;` matches what you filled.

---

## E14 — TV: Jadual Imam & Bilal template (all 7 themes)

```
Implement PRD §6.3–§6.4 on the TV using weekRoster/resolveRoster from E3.
1. New template jadual_petugas in all 7 themes, areas bottom 12:5, side 5:4, poster 16:9.
   - view minggu: 7 rows Isnin → Ahad, columns Hari | Imam | Bilal; today highlighted (not by colour alone); "+ ikut waktu" marker for days with exceptions.
   - view hari_ini: today's 5 waktu (Zohor → "Jumaat" on Friday) × Imam | Bilal, plus "Esok: Imam … · Bilal …".
   - names "title + name", shrink to fit down to 18 px, then ellipsis; empty = "—"; title from fields (default "Jadual Imam & Bilal").
2. isEmpty → skipped when there are no slots.
3. The day changes at local midnight without a reload.
4. Playwright screenshots into designs/qa/petugas/: 7 themes × 3 areas × (minggu, hari_ini, Friday hari_ini, long names). Do NOT run playwright install.
Run npm test and npm run build.
```
**Check:** in the side 5:4 area, the 7-row week table is still readable (all text ≥ 18 px). If not, ask Claude to switch side 5:4 to show only today + the next 3 days and update the PRD.

---

## E15 — Admin: Jadual Imam & Bilal editor; hide the old template

```
1. Template picker: "Jadual Imam & Bilal" (jadual_petugas). Editor: view (Mingguan / Hari ini), title (≤ 40), live preview from the masjid's real roster, a link "Urus petugas" to /admin/petugas, the hint from PRD §6.4 when Mingguan is chosen and exceptions exist, and an empty-state message with a link when there is no roster.
2. Hide the old imam_bilal template from the picker. Existing imam_bilal slides still render and stay editable; their editor shows "Templat lama — gunakan Jadual Imam & Bilal untuk jadual ikut hari" with a button that creates a new jadual_petugas slide (the old one is not deleted).
3. i18n, tests. Run npm test and npm run build.
```
**Check:** the picker shows 12 templates; an old imam_bilal slide (create one in dev SQL if needed) still shows on the TV and has the migration notice in its editor.

---

## E16 — You: test sprint 3 (about 45 minutes)

1. On the pilot TV (app) add the roster slide in **Mingguan** view: today is highlighted; read every name from 5 m away.
2. Switch to **Hari ini**; on a Friday (or `?debug=1&day=fri`) Zohor shows "Jumaat".
3. Deactivate one imam → disappears from the TV within ~70 s.
4. Leave the TV on overnight: at midnight the highlighted day moves without anyone touching it.
5. Ask your AJK whether names should show titles ("Ust.", "Hj.") and whether the week should start on Isnin or Ahad. Changes are one prompt each.

---

## E17 — Production rollout

```
Prepare the production rollout of the enhancements. Do not run anything against masjidview-prod yourself. Give me a numbered checklist with copy-paste commands and SQL:
1. Backup masjidview-prod (supabase db dump to a folder outside the repo).
2. Apply the enhancements migration to prod FIRST (same method as dev). It is additive: TVs on the old app keep working. Verify: the template_key constraint lists 13 keys; select public.bundle_islamic_events(); returns [].
3. Enter the takwim on prod (Platform → Takwim), or a SQL copy of the dev rows if I confirm the dev dates are the real ones.
4. Merge branch enhancements into main, push, confirm the Cloudflare Pages deploy finished and which app_version string the TVs will report; confirm https://masjidview.my/apk and /apk/latest.json are live.
5. A SQL query on prod listing screens whose app_version is not the new web version and whose last_seen_at is within 24 h.
6. Smoke test on prod with my own pilot masjid: a postponed kuliah, a Hari Kebesaran slide, a roster slide; the app on the pilot TV.
7. Rollback: how to revert the app deploy; SQL to pause the new slides (status = 'paused' where template_key in the 3 new keys or fields ? 'notice'); the tables can stay.
```
**Check (prod):** the pilot TV shows all three new slides correctly; `select template_key, count(*) from slides group by 1;` looks as expected; Skrin shows "App TV 1.0.x" for the pilot screen.

---

## Notes

- **Takwim duty:** you are the only one who can enter the Islamic dates. Once a year, plus confirming Ramadan and Syawal when they are announced.
- **Signing key:** back it up twice. It is the only thing that lets you update the app on every TV.
- **Google Play (Phase B):** use the `play` AAB from the same workflow. Decide personal vs organisation account first (PRD §8.7).
- Not in this round: date-specific gantian for imam/bilal, khatib/tarawih roles, roster in the prayer area of themes, per-masjid custom events.
