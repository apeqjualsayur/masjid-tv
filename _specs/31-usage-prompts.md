# Masjid View — Usage monitoring: setup + Claude Code prompts (U0–U6)

Spec: `_specs/30-PRD-usage.md` · SQL: `_specs/32-usage-migration.sql` · Design: `designs/admin/D-Usage.html` (open it in Chrome to see the target).

**How to use:** open the `masjid-tv` folder in VS Code → Terminal → `claude`. Paste one prompt at a time. Wait for its **Check** to pass before the next. If Claude Code asks a question or shows a plan, read it and answer before it continues. Start each prompt in a fresh conversation (`/clear`) so it re-reads the specs.

Order: Step 0 (you) → U0 → U1 → U2 → U3 → U4 → U5 (prod). U6 is optional. Everything up to U5 runs on **masjidview-dev** only.

---

## Step 0 — Preparation (you, about 20 minutes)

1. **Copy the pack into the repo:** `_specs/30-PRD-usage.md`, `_specs/31-usage-prompts.md`, `_specs/32-usage-migration.sql` → `masjid-tv/_specs/`; `designs/admin/D-Usage.html` → `masjid-tv/designs/admin/`.
2. **Billing cycle day:** supabase.com → your organisation → **Usage**. Note the cycle shown at the top (e.g. "15 Oct – 14 Nov" → day **15**).
3. **Current plan and compute:** project **masjidview-prod** → **Project Settings → Compute and Disk**. Note the size (Free = Nano).
4. **pg_net:** in **both** projects: **Database → Extensions** → search `pg_net` → enable. (pg_cron is already on from Phase 2.)
5. **Cron secret:** in the VS Code terminal run
   `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`
   and save the result in your password manager as *Masjid View CRON_SECRET*. Use a different one for dev and prod.
6. **Domain price:** find your Hostinger renewal price for masjidview.my (RM per year) on the invoice.

---

## U0 — Audit (read only)

```
Read the project rules file (CLAUDE.md or AGENTS.md), then _specs/30-PRD-usage.md, _specs/32-usage-migration.sql and designs/admin/D-Usage.html. Do NOT change any file and do not run anything that writes to a database.
Report back in plain English:
1. Which rules file this repo uses.
2. Where /admin/platform lives, how its tabs work today, and how the active tab is chosen (file paths).
3. The highest migration number in supabase/migrations/, and whether the Supabase CLI is installed and linked (read-only commands only, e.g. `supabase --version`, `supabase projects list`).
4. The name of the existing email Edge Function, the env/secret name it reads for the Resend API key, and its sender address. Never print secret values.
5. The latest screen_bundle definition in our migrations compared with _specs/11-schema.sql §7: list every difference.
6. A read-only SQL query I can paste into the Supabase SQL editor on masjidview-prod that prints the live screen_bundle definition, and tell me to paste the result back to you.
7. Whether `npm test` and `npm run build` pass right now (run them).
Finish with a short plan for U1–U5 adjusted to what you found, and any risk you see.
```
**Check:** you get a report with all 7 answers. Run the query from point 6 on **prod**, paste the output back into the same chat, and keep that chat open for U1 (or save the output as `_specs/live-screen_bundle.sql`).

---

## U1 — Database: telemetry, settings, report (dev)

```
Implement the database part of _specs/30-PRD-usage.md §5.
1. Create supabase/migrations/<next number>_usage.sql from _specs/32-usage-migration.sql.
   - Compare section 4 (screen_bundle) with the LIVE definition in _specs/live-screen_bundle.sql (or what I pasted). If they differ, keep the live body and add only the two blocks marked "usage:" plus the v_out variable. Show me the diff of the function and wait for my OK before saving.
   - Keep everything else exactly as in the spec file.
2. Extend scripts/rls-check.ts (same PASS/FAIL style) with:
   - anon cannot execute platform_usage, usage_report, usage_note_ping, usage_set_emails, usage_mark_alert
   - a signed-in non-owner calling platform_usage gets not_allowed; the owner gets JSON with keys cycle, live, cycle_to_date, settings
   - after one anon screen_bundle call for a test screen, usage_screen_daily has a row for that screen with pings ≥ 1 (read with the service role)
   - usage_calibrate with tomorrow's date fails with bad_date
   - clean up all test rows and users at the end, even on failure
3. Tell me step by step how to apply the migration to masjidview-dev (ask whether I prefer SQL editor copy-paste or `supabase db push`), then run `npm run rls-check`.
4. Give me the two cron.schedule statements from section 9 of the spec file to run in the dev SQL editor.
Do not touch masjidview-prod.
```
**Check (dev):**
- `npm run rls-check` → all PASS.
- Pair a TV (or your laptop at `localhost:3000/tv`) to dev, wait 5 minutes, then in the SQL editor:
  `select day, pings, full_bundles, bytes_out from usage_screen_daily order by last_seen desc limit 5;` → pings increases about 1 per minute.
- `select public.usage_snapshot(); select * from usage_daily;` → one row for today.
- `select cron.job.jobname from cron.job;` → shows `masjidview-usage-snapshot` and `masjidview-usage-trim`.

---

## U2 — Model and tests (no UI yet)

```
Implement _specs/30-PRD-usage.md §2, §3 and §6 as pure TypeScript.
- src/admin/usage/types.ts: types for the platform_usage() JSON (PRD §5 shape; the REPORT constant in designs/admin/D-Usage.html is a full sample).
- src/admin/usage/model.ts: port model() from designs/admin/D-Usage.html. Pure: no React, no fetch, no Date.now() (use report.generated_at and cycle.today). No display strings: return metric keys ('egress', 'cached', 'db', 'storage', 'rps', 'email_day', 'email_month', 'mau') and action codes ('fix:<metric>', 'backup', 'calibrate', 'email_sync', 'snapshot', 'prices', 'none') with their numbers; the UI translates them. Imports only from ./types.
- Fixture: tests/fixtures/usage-report.json = the design's REPORT (generate the 84-day history once and save it, so tests are deterministic).
- src/admin/usage/model.test.ts (Vitest) covering PRD §10 item 7: projection maths, level boundaries 69/70/90/100%, calibration factor applied only within 45 days, runs-out-at and runs-out date, weekly slope, cost with and without overage, Pro + compute choice, scale rows, every action rule, and an empty report (0 screens, 1 day of data) that must not throw or divide by zero.
- package.json script "sync:usage-model": copies model.ts → supabase/functions/_shared/usage-model.ts and types.ts → supabase/functions/_shared/usage-types.ts with a first line "// generated by npm run sync:usage-model — edit src/admin/usage/*", rewriting the import path. Add a test that fails if the copies are stale.
Run npm run sync:usage-model, npm test and npm run build; paste the summary lines.
```
**Check:** `npm test` passes, with the new tests listed; `supabase/functions/_shared/usage-model.ts` exists.

---

## U3 — Alert and email-count job (Edge Function `usage-digest`, dev)

```
Create supabase/functions/usage-digest/index.ts per _specs/30-PRD-usage.md §8.
- Reject unless header x-cron-secret equals Deno.env.get('CRON_SECRET') → 401 with no detail.
- Use SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the Edge runtime, and the Resend key secret name found in U0.
- Email count: GET https://api.resend.com/emails?limit=100, follow has_more/after, wait 600 ms between pages, stop once created_at is before 00:00 two days ago (Asia/Kuala_Lumpur). Group by Malaysian date; rpc usage_set_emails for each of the last 3 days (the job runs every 2 days). If Resend fails, log only the HTTP status and continue.
- Alerts: rpc usage_report → model from ../_shared/usage-model.ts → for every metric at warn or crit, rpc usage_mark_alert(metric, level); keep those that return true. Add a 'snapshot' item if snapshot_at is older than 2 hours (also through usage_mark_alert).
- If any items: send ONE email via Resend (same sender as the existing notify function) to Deno.env.get('OWNER_EMAIL'). Subject: "Masjid View: <worst metric> <used %> (<Perhatian|Tindakan>)". Body in BM: one line per item (used, projected, action), then https://masjidview.my/admin/platform?tab=penggunaan. Plain text + simple HTML.
- Respond with JSON {emails_counted, alerts_sent}. Never log keys or email addresses.
Then give me non-coder steps for masjidview-dev:
1. supabase secrets set CRON_SECRET=… OWNER_EMAIL=…  (with --project-ref for dev)
2. supabase functions deploy usage-digest --no-verify-jwt
3. One curl command to call it with the x-cron-secret header.
4. SQL for the dev SQL editor: vault.create_secret for 'project_url' and 'cron_secret', and cron.schedule('masjidview-usage-digest', '7 0 */2 * *', …) using net.http_post with the URL and header read from vault.decrypted_secrets. Show me the SQL; I will run it.
```
**Check (dev):**
1. The curl call returns `{"emails_counted": …, "alerts_sent": 0}`; `select * from usage_email_daily;` has today.
2. Force one alert, then restore:
   ```sql
   update usage_settings set limits = jsonb_set(limits, '{free,db_bytes}', '1000000');   -- 1 MB, forces "crit"
   ```
   Run the curl again → you receive **one** email. Run it a third time → **no** new email.
   ```sql
   update usage_settings set limits = jsonb_set(limits, '{free,db_bytes}', '500000000');
   delete from usage_alerts;
   ```
3. `select jobname, schedule from cron.job;` shows `masjidview-usage-digest`. After the next run time: `select status, return_message from cron.job_run_details order by start_time desc limit 3;` → succeeded.

---

## U4 — The Penggunaan tab (UI)

```
Build the Penggunaan tab on /admin/platform per _specs/30-PRD-usage.md §7 and designs/admin/D-Usage.html (open it in a browser; match order, spacing and colours, but use our existing admin components, Tailwind tokens and fonts, not the file's CSS).
- Selected with ?tab=penggunaan; existing tabs keep working. Platform owners only.
- Data: one supabase.rpc('platform_usage') call → model.ts. Loading skeleton, error card with "Cuba lagi", "Dikemas kini HH:MM", Muat semula button, auto-refresh every 5 min while the page is visible.
- Components in src/admin/usage/: UsageSummary, UsageMeter, UsageActions, GrowthChart (inline SVG, no library), ScaleTable, CalibrationForm (rpc usage_calibrate; GB 0–100000, date ≤ today), PlanSettingsForm (rpc usage_update_settings). After a save: toast, then refetch.
- Empty state per PRD §7 (fewer than 2 days of data).
- All text in src/admin/i18n/ms.json and en.json (BM from the design; natural English).
- Computer ≥ 1024 px as the design; phone single column, the scale table scrolls inside its card only. Meter bars have aria-labels; status is shown by text pill and colour, never colour alone. Tap targets ≥ 44 px.
Run npm test and npm run build. Then tell me how to open it locally against masjidview-dev and what I should see.
```
**Check (local, dev data):**
- Open `http://localhost:3000/admin/platform?tab=penggunaan` signed in as yourself → the tab loads; Pangkalan data and Storan fail match Supabase → Usage for **dev** within 5%.
- Enter a calibration (any small numbers) → the egress meter source line shows "Anggaran ×… (diselaraskan)".
- Switch "Pelan Supabase" to Pro and save → limits change to 8 GB / 100 GB / 250 GB; switch back to Free.
- Browser narrowed to phone width: no sideways page scroll.
- Sign in with a non-owner test account → the tab is not visible.

---

## U5 — Production rollout

```
Prepare the production rollout of usage monitoring. Do not run anything against masjidview-prod yourself. Give me a numbered checklist with copy-paste commands and SQL:
1. Backup first: `supabase db dump` of schema and data for prod into a folder outside the repo (Free plan has no daily backups).
2. Apply <next>_usage.sql to masjidview-prod (same method as dev), then the snapshot and trim cron statements.
3. Verify live TVs still sync: a query on screens.last_seen_at and usage_screen_daily to run 5 minutes later.
4. Prod secrets (CRON_SECRET for prod, OWNER_EMAIL), deploy usage-digest to prod, Vault secrets and the digest schedule.
5. git add/commit (no secrets), git push → Cloudflare Pages deploys the UI; how to confirm the deploy finished.
6. On the live tab: set Pelan dan kadar (cycle day, plan, compute, fx 4.20 or today's rate, domain RM/year), then the first calibration from Supabase → Usage.
7. Rollback steps: unschedule the three cron jobs, restore the previous screen_bundle from the earlier migration file, and what can safely stay.
```
**Check (prod):**
- Every paired TV still shows content and `screens.last_seen_at` is within the last 2 minutes.
- `select count(*) from usage_screen_daily where day = public.usage_today();` ≈ number of online TVs.
- The tab at `https://masjidview.my/admin/platform?tab=penggunaan` loads; the first calibration is saved.
- After the first scheduled run (08:07 Malaysian time on an odd day of the month): `select * from usage_email_daily order by day desc limit 3;` has rows, and the "Kiraan emel" action is not shown.

**Monthly routine (5 minutes):** Supabase → Usage → copy Egress and Cached Egress into the Selaraskan form. When you upgrade any plan, update "Pelan dan kadar" the same day.

---

## U6 — Optional: slower TV checks overnight (after 2 weeks of data)

```
Optional egress saving from _specs/30-PRD-usage.md (Tindakan for 'egress'). Change the TV bundle sync interval: 60 s normally, 120 s from Isyak + 30 min until Subuh − 30 min, using the prayer engine's times for the masjid's zone (must work offline; fall back to 60 s if times are unavailable). Put the interval logic in src/core or src/data as a pure function with Vitest tests (Friday, around midnight, missing times). Do not change pairing polling (5 s). Run npm test and npm run build, and tell me how to verify on a TV with ?debug=1&sim=… .
```
**Check:** after a week, the Egress meter's projected % drops by roughly 15–20% (counted, not assumed).
