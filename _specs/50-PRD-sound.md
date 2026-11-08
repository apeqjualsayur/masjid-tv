# 50 — Sound cues on the TV (PRD)

Status: approved 2026-11-08 (owner decisions D1–D11). If code and this spec disagree, the spec wins.

## 1. Goal
Optional, per-screen sound on the TV at two moments: when the azan starts and when solat starts (the
end of the iqamah countdown). Off by default. It never blocks the display: a missing sound is simply
quiet, never an error or a blank screen.

## 2. Decisions
- **D1 Scope:** per screen, stored in `screens.sound`. Screens with the `poster` layout never play
  sound. The admin hides the controls for them but keeps the stored value, which applies again if the
  layout changes back.
- **D2 Cues:**
  - **azan** plays when AZAN mode starts: Subuh, Zohor, Asar, Maghrib, Isyak, and Friday Zohor (Jumaat).
  - **iqamah** plays when the iqamah countdown ends and SOLAT starts. Never on Friday Zohor
    (khutbah → solat), and never for Imsak or Syuruk.
  - A mode of length 0 has no start, so it has no cue (`azanMin: 0` or `iqamahMin: 0`, possible only in
    screen.json; the admin's minimums are 3 and 1).
- **D3 Sounds:** `off | beep | chime | alarm | hayya`.
  - beep, chime and alarm are built with the Web Audio API: no files, works offline.
  - hayya is the owner's recording, `public/sounds/hayya-ala-solah.mp3`. Never generate or download
    voice audio.
  - If the file is missing or won't decode, chime plays instead, with one `console.warn` per page load.
- **D4 Settings shape:** `{ enabled: false, volume: 70, azan: "chime", iqamah: "hayya" }`.
  - `volume` is 0–100 and maps to gain = (volume/100)².
  - Off by default for every screen, existing and new.
  - Anything missing or invalid → the defaults (so OFF).
- **D5 Once per live transition:**
  - A cue plays only when the previous clock tick (same page, same app instance) was in a different mode
    and the new mode started no more than `tol` ago. `tol` = max(3 s, 2 × the simulated time per tick).
  - So there is no cue on the first tick after a page load, a nightly soft restart, or waking from the
    background in the middle of a mode; and none when the clock jumped more than `tol` past the start.
  - Each (date, prayer, cue) plays at most once per page load, so a clock correction that moves time
    back across the start never plays it twice.
  - Forced modes (`?mode=`) play their cue on the first tick: `azan` → azan cue; `solat` → iqamah cue
    (not when Friday Zohor is forced); `pre_azan`, `iqamah`, `khutbah` → none (a forced countdown never
    ends).
- **D6 Autoplay:**
  - Audio starts locked.
  - A small speaker-off icon shows when sound is enabled, audio is locked, the layout is not `poster`,
    and the mode is `normal` (the same quiet rule as the "press OK" hint; PRD §5: the SOLAT screen
    shows only a tiny clock).
  - The icon is drawn by `src/app/tv`, never by theme code: top-right of the stage, 24 px margin, 44 px,
    45 % opacity, no blur in any mode.
  - Any key, click or tap unlocks audio (`AudioContext.resume()`) and hides the icon. The same OK press
    also does the hint's full screen.
  - A locked or failing sound never throws, never blanks the screen and never delays a mode change:
    playback is fire-and-forget, after render.
- **D7 Caps:**

  | Sound | Length |
  |---|---|
  | beep | 3 × 180 ms, 880 Hz, 150 ms gaps (≈ 0.9 s) |
  | chime | ≈ 3 s, 3-note bell with decay |
  | alarm | 2-tone pulse, stops at ≤ 10 s |
  | hayya | ≤ 15 s; a longer file is cut at 15 s with a 0.5 s fade |

  The owner trims the recording to ≤ 15 s (the first file is 17.4 s); the cut is only a safety net. A
  new cue stops a cue still playing.
- **D8 Sync:**
  - `screen_bundle` returns `screen.sound`; changing `screens.sound` bumps `bundle_version`.
  - Older TV apps drop the field (`parseBundleAnswer` keeps only known screen keys).
  - A bundle without the field (or a stored bundle from an older version) means OFF.
  - Local mode: a `sound` object in screen.json.
  - Test settings, only with `?debug=1` or on localhost, never with `?demo=1`: `sound=1` (on),
    `soundAzan=` and `soundIqamah=` (`off|beep|chime|alarm|hayya`), `vol=` (0–100), `mute=1` (forces off).
    They override the bundle on paired TVs too, like `theme=`.
- **D9 Admin:** the Skrin edit sheet gets a **Bunyi** section, hidden when the layout chosen is `poster`:
  - an on/off switch;
  - a volume slider (0–100, step 5);
  - two choice groups, *Semasa azan* and *Semasa iqamah*: Tiada / Bip / Loceng / Penggera /
    Hayya 'alas solah, with a **Cuba** button per option that plays on this device at the chosen volume;
  - helper text: the sound plays through the TV's speakers, so the TV must not be muted and its volume
    must be up; *Cuba* plays on this phone or computer only.
  - Saved with the sheet's existing Save button.
- **D10 Out of scope:** pre-azan sound, per-waktu exceptions, quiet hours. The live demo
  (`/tv?demo=1`) never plays sound.
- **D11 Daily restart:** once audio has been unlocked on a TV, the 03:00 daily restart is a soft restart
  (no page reload), so sound keeps working. New app versions then load through the "Versi baharu" hint
  or by switching the TV off and on (as for TVs kept full screen by a key press).

## 3. Files to create or change

| Folder | File | Change |
|---|---|---|
| `src/core` | `sound.ts` + `sound.test.ts` (new) | Pure, no DOM. `SoundKind`, `SoundSettings`, `DEFAULT_SOUND`, `parseSoundSettings(raw)` (lenient → defaults), `cueFor(prev, cur, opts)` → `"azan" \| "iqamah" \| null` (D2, D5), `cueKey()` for de-duplication, `cueTolerance(speed)` |
| `src/core` | `index.ts` | export the above |
| `src/audio` (new) | `engine.ts` | one `AudioContext`; `locked` state + `subscribe`; `unlock()`; every call wrapped, never throws |
| `src/audio` | `synth.ts` + test | beep / chime / alarm as note lists (data, tested against D7), rendered with oscillators + gain |
| `src/audio` | `hayya.ts` + test | fetch + decode `/sounds/hayya-ala-solah.mp3` once (fetch injected for tests); missing → chime + one warn; 15 s cut |
| `src/audio` | `play.ts` + test | `playCue(kind, volume)`: fire-and-forget, stops the previous cue, no-op when locked, unsupported or `off` |
| `src/data` | `bundle.ts` + test | `BundleScreen.sound?: SoundSettings` via `parseSoundSettings`; missing → undefined (OFF) |
| `src/app/tv` | `config.ts` + test | `ScreenConfig.sound`; screen.json `sound`; test settings `sound`, `soundAzan`, `soundIqamah`, `vol`, `mute` (debug/localhost only, never demo) |
| `src/app/tv` | `bundle-config.ts` + test | carry `bundle.screen.sound` into `ScreenConfig.sound` |
| `src/app/tv` | `sound.tsx` (new) | `useSoundCues(...)`: keeps the previous tick, calls `cueFor`, then `playCue` after render; `SoundLockIcon` (D6) |
| `src/app/tv` | `tv-app.tsx` | `Display` calls `useSoundCues`; renders `SoundLockIcon` next to the theme |
| `src/app/tv` | `hooks.ts` + `screen-mode.test.ts` | D11: `dailyRestart(...)` is soft when kept full screen by a key press **or** audio is unlocked |
| `src/admin/screens` | `logic.ts` + test | `Screen.sound?`, `SOUND_KINDS`, `soundOf(screen)`, `soundEqual` (dirty check) |
| `src/admin/screens` | `ScreensView.tsx` | Bunyi section in `ManageSheet`; select `sound` with a fallback before the migration (like `view_mode`); save sends `sound` only when the column was loaded |
| `src/admin/i18n` | `ms.json`, `en.json` | `screens.sound.*` (title, switch, volume, azan, iqamah, the 5 options, try, help) |
| `public/config` | `screen.json` | `"sound": { "enabled": false, "volume": 70, "azan": "chime", "iqamah": "hayya" }` (demo.json unchanged: never sound) |
| `public/sounds` | `hayya-ala-solah.mp3` | owner's file (≤ 15 s); precached by `build-sw.ts` like every exported file |
| `scripts` | `sw-template.js` | `/sounds/*` cache-first (a cue never waits on the network) |
| `scripts` | `rls-check.ts` | `soundChecks()` (§5) |
| `supabase/migrations` | `0011_screen_sound.sql` (new) | §4 |
| `_specs` | `11-schema.sql` | fold in 0010 (missing until now) and 0011 |
| `src/landing` | panduan sections (ms/en) | short "Bunyi" section: TV not muted, press any key once after switching on, Fully Kiosk autoplay (to verify on the pilot TV) |
| root | `AGENTS.md`, `CLAUDE.md` | `src/audio` folder, rule, test settings |

## 4. Migration `0011_screen_sound.sql` (one transaction; the owner runs it in the SQL editor)

```sql
begin;
alter table public.screens add column if not exists sound jsonb not null
  default '{"enabled":false,"volume":70,"azan":"chime","iqamah":"hayya"}'::jsonb;
alter table public.screens drop constraint if exists screens_sound_valid;
alter table public.screens add constraint screens_sound_valid check (
  jsonb_typeof(sound) = 'object'
  and jsonb_typeof(sound->'enabled') = 'boolean'
  and jsonb_typeof(sound->'volume') = 'number'
  and (sound->>'volume')::numeric between 0 and 100
  and sound->>'azan'   in ('off','beep','chime','alarm','hayya')
  and sound->>'iqamah' in ('off','beep','chime','alarm','hayya'));

-- A sound change is display-relevant: bump bundle_version.
-- last_seen_at / app_version / view_mode still don't.
create or replace function public.screens_after_change() ... -- 0001 body; the compared tuple gains sound

-- screen_bundle: the 0010 body unchanged except the screen object:
--   'screen', jsonb_build_object('id', s.id, 'name', s.name, 'theme', s.theme, 'layout', s.layout, 'sound', s.sound)
create or replace function public.screen_bundle(p_secret text, p_since bigint default 0,
  p_app_version text default null, p_view_mode text default null) ...
commit;
```

- Adding the column doesn't fire the trigger, so there is no wave of re-syncs.
- Same function signature, so `create or replace` (no overload); grants unchanged.
- No RLS change: `screens_update` already allows Pentadbir only.

## 5. Tests
- **`src/core/sound.test.ts`:** azan cue for each of the 5 prayers and Friday Zohor; iqamah cue only on
  iqamah → solat, never on Friday; never for Imsak, Syuruk or the poster layout; none on the first tick,
  a jump of tol + 1 ms, or `enabled: false` / `off`; fires at exactly tol; the de-dup key blocks a replay
  after the clock goes back; forced-mode mapping; tolerance at speed 1 / 10 / 100; `parseSoundSettings`
  with junk, partial or out-of-range input.
- **`src/audio/*.test.ts`:** note lists within the D7 caps; hayya fallback on a 404 or decode error warns
  once; `playCue` with no `AudioContext` (Vitest node) or a locked context resolves without throwing.
- **`src/data/bundle.test.ts`:** sound parsed; missing means OFF; a stored bundle without it still loads.
- **`src/app/tv/config.test.ts`:** screen.json sound; test settings honoured with debug or localhost,
  ignored otherwise and with `demo=1`; `mute=1` wins.
- **`src/app/tv/screen-mode.test.ts`:** `dailyRestart` soft when audio is unlocked (D11).
- **`src/admin/screens/logic.test.ts`:** dirty check; defaults for rows from before the migration.
- **`scripts/rls-check.ts`:** A can change their own screen's sound; B can't change A's; an invalid sound
  is rejected by the check; a sound change bumps `bundle_version` and `screen_bundle` returns
  `screen.sound`; a sync without changes doesn't bump; anon can't read `screens`.
- **Manual, on the pilot TV:** each sound at volume 70; after power on the icon shows → one OK press →
  the icon goes; `?debug=1&mode=azan&sound=1`; network unplugged → hayya still plays.

## 6. Risks
- **Autoplay:** after a power-on the TV is silent until a key press, unless the kiosk browser allows
  autoplay (Fully Kiosk setting not yet checked). D11 keeps the unlock across the nightly restart. If
  nobody presses a key, the cue is silently skipped; the icon is the only sign.
- **TV muted / volume down / HDMI-CEC:** the app can't detect it. The admin helper text and the guide
  cover it.
- **Clashing with the masjid's live azan:** a cue at azan time may compete with the muezzin on the PA
  system, which is why the default is off. Check with the pilot AJK. Whether a "Hayya 'alas solah" clip
  is appropriate as a cue should be checked by an ustaz, like the ayat sources.
- **D11 side effect:** a TV with unlocked audio no longer picks up new app versions at 03:00; it relies
  on the "Versi baharu" hint or a power cycle.
- **Old TV browsers without Web Audio:** silent no-op (tested with no AudioContext).
- **Every TV downloads the 279 KB recording,** even with sound off, because it's precached. Acceptable;
  leaving it out of the precache would make a first hayya need the network.
- **Rollout order:** app before migration → the admin hides Bunyi and saves without sound, TVs get no
  sound (OFF); migration before app → TVs ignore the field. No order breaks anything.
- **Background tabs / screen off:** timers slow down, so the first tick back is past `tol` and there is
  no cue (correct by D5).
