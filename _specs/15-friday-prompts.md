# Friday Update — Step-by-step (Claude Code or Antigravity)

Adds three things:
1. **Friday info strip** on the normal screen: *SOLAT JUMAAT · Azan 1:05 · Khutbah 1:08 (±40 minit) · Solat ±1:48*
2. **Separate Solat Jumaat length** (`jumaatSolatMin`)
3. **"Dijangka tamat ±1:48"** and a progress line on the khutbah screen

Specs: `00-PRD.md` §4, §5, §5.1, §12 item 2 · `01-theme-contract.md` v0.2 (FridayInfo, rules 12–13) · `10-PRD-phase2.md` §4.6 · `14-friday-migration.sql`.

Same method as before: **one prompt per session**, do the **Check**, then **commit** (`git add -A && git commit -m "J.x done"`). If a check fails, paste the error back and ask for a fix.

**Which steps to run**

| Where you are | Run |
|---|---|
| Phase 1 done, Phase 2 not started | J.0 → J.1 → J.2 → J.4. Phase 2 prompt 2.5 already includes the Jumaat settings, and the v0.2 schema already has the new defaults. |
| Phase 2 in progress or done | J.0 → J.1 → J.2 → J.3 → J.4 |
| Phase 1 not finished | Replace the spec files (J.0) and carry on; Prompt 2 and Prompts 5–7 will pick up the Friday rules. Run J.4 at the end. |

---

## J.0 🧑 You — update the spec files (≈5 min)
1. Unzip `masjidview-friday-update.zip` into the project folder and let it replace: `_specs/00-PRD.md`, `_specs/01-theme-contract.md`, `_specs/10-PRD-phase2.md`, `_specs/11-schema.sql`, `_specs/12-phase2-prompts.md`. New files: `_specs/14-friday-migration.sql`, `_specs/15-friday-prompts.md`.
2. In VS Code (or Antigravity) open the Source Control panel and check the changed files are listed. Commit: `git add -A && git commit -m "specs: Friday update"`.
3. Ask your pilot AJK two numbers: **how long is the khutbah** and **how long is Solat Jumaat** (from iqamah to salam). You'll enter them in J.4.

---

## J.1 Engine: Friday info + Solat Jumaat length

```
Read _specs/00-PRD.md §4, §5, §5.1, §9.4 and _specs/01-theme-contract.md (FridayInfo, DisplayState.friday).
In src/core only (no styling):
1. Config: add durations.jumaatSolatMin (default 12) and durations.showFridayInfo (default true) to the config type, public/config/screen.json and every place defaults are merged. Old configs without these keys must still work.
2. modes.ts: on Friday Zohor the SOLAT step uses jumaatSolatMin instead of solatMin. Khutbah modeProgress and modeRemainingSec must be correct.
3. New fridayInfo(dayTimes, durations, now, clock24h) → FridayInfo | undefined, per PRD §5.1: only on Friday, only if showFridayInfo, only from 00:00 until Solat Jumaat ends; times formatted with the same formatter as the prayer list (12h without AM/PM unless clock24h).
4. Put the result in DisplayState.friday. PRE_AZAN banner text on Friday: "Azan Jumaat dalam N minit".
5. Vitest tests: Friday 00:00 strip present; 1 minute after Solat Jumaat ends absent; Thursday absent; showFridayInfo=false absent; custom khutbah 30 / solat 15 gives the right estimates; SOLAT lasts jumaatSolatMin on Friday and solatMin on other days; 24h clock formatting.
Do not touch src/themes in this step.
```
**Check:** `npm test` passes. Open `/tv?sim=2026-10-23T12:58:00&speed=20&debug=1` (23 Oct 2026 is a Friday) and watch the debug panel: mode goes pre_azan → azan → khutbah → solat → normal, and the solat step lasts 12 simulated minutes.

---

## J.2 Themes: Friday strip + khutbah screen

```
Read _specs/01-theme-contract.md rules 12 and 13 and the khutbah screen of each theme.
For each theme (tenang, serambi, alam):
1. Implement fridayInfo per rule 12 and render it in all three layouts (full, bottom, side) in the placement the rule gives. Bottom layout: the poster area must keep its exact 12:5 size — check posterArea is unchanged.
2. Update the khutbah screen per rule 13: "Khutbah sedang disampaikan", clock, "Dijangka tamat ±{s.friday.solatStart}", thin progress line from s.modeProgress. No per-second countdown digits.
3. Colours only from the theme's phase tokens (Serambi: gold). Fade in/out only; respect lite mode.
4. Add a debug shortcut: with ?debug=1, the key F toggles a forced Friday (same as &day=fri) so I can switch quickly.
Then take screenshots with Playwright at 1920×1080 into designs/qa/friday/ (git-ignored): 3 themes × 3 layouts at Friday 10:00, plus the khutbah screen of each theme. Do NOT run playwright install.
```
**Check:** open the screenshots folder and look at all 12 images. For each one ask: is the strip readable, does it cover any prayer time, is the poster the same size as on a weekday? Then live: `/tv?theme=serambi&layout=bottom&sim=2026-10-23T10:00:00&debug=1` → strip visible; change `sim` to `2026-10-22T10:00:00` (Thursday) → strip gone.

---

## J.3 Admin + database (only if Phase 2 is in progress or done)

```
Read _specs/14-friday-migration.sql and _specs/10-PRD-phase2.md §4.6.
1. Check whether the dev database needs the migration: run the "Check first" query from 14-friday-migration.sql (tell me exactly where to paste it). If the default does not contain jumaatSolatMin, copy the file to supabase/migrations/ as the next number, explain it in plain words, and help me run it.
2. Tetapan: add the Jumaat section per PRD §4.6 — khutbah minutes (10–60), Solat Jumaat minutes (5–30), switch "Papar info Jumaat", and a live example line using this Friday's Zohor for the masjid's zone ("Azan 1:05 · Khutbah 1:08 (±40 minit) · Solat ±1:48"). Save into org_settings.durations (merge, never overwrite other keys). BM + EN strings.
3. TV sync: make sure the bundle → config mapping passes jumaatSolatMin and showFridayInfo through (defaults if missing).
4. Update scripts/rls-check.ts: saving durations bumps bundle_version.
```
**Check:** in Tetapan set khutbah 30 and Solat Jumaat 15 → example line changes instantly → Simpan. Within about a minute a paired TV opened with `&sim=2026-10-23T10:00:00&debug=1` shows "Khutbah 1:08 (±30 minit) · Solat ±1:38". Turn "Papar info Jumaat" off → the strip disappears from the TV.

---

## J.4 🧑 You — try it on the pilot TV
1. Enter the pilot AJK's real numbers: in Tetapan (Phase 2) or in `public/config/screen.json` (Phase 1 only: `khutbahMin`, `jumaatSolatMin`).
2. Thursday evening: open the TV with `?sim=` set to Friday 10:00 and `&debug=1` → check the strip from the back of the prayer hall. If it's hard to read, ask the agent: "Make the Friday strip text 20% larger in <theme>, keep the poster size."
3. Remove `sim`/`debug` from the TV address.
4. On the real Friday: note when the khutbah actually ended and when solat ended. If the estimates were off by more than 3 minutes, adjust the two numbers in Tetapan. No code change needed.
