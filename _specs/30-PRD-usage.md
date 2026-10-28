# Masjid View — Platform › Penggunaan (usage monitoring) PRD (v0.1)

> Adds a **Penggunaan** tab to `/admin/platform` so the platform owner can see current usage against every free-tier limit, a projection to the end of the billing cycle, when each limit will run out as masjids grow, and what to do about it.
> This is the "Kos" tab from the Konsol Pemilik plan (C4), plus the TV telemetry it needs (part of C2). Ringkasan / Peta / Trafik tabs stay optional for later.
> Design reference: `designs/admin/D-Usage.html` (plain HTML, opens in a browser, sample data). SQL: `_specs/32-usage-migration.sql` (tested on Postgres 16). Prompts: `_specs/31-usage-prompts.md`.

---

## 1. Goal

Open `/admin/platform?tab=penggunaan` and, within 10 seconds, know:
1. **Are we safe this cycle?** Each limit as used / limit, % and projected % at cycle end.
2. **What does it cost now, and what should it cost?** Current RM/month and the recommended plan.
3. **When will something run out?** Masjid count and approximate month for each limit, from the real growth trend.
4. **What should I do?** A short, ordered list of actions with the exact place to do them.

Plus: a **daily-checked email alert** when any metric crosses 70% or 90% (or is projected to exceed 100%), once per metric per level per billing cycle.

**Not included:** sliders or what-if inputs (the standalone cost calculator artifact covers that), per-masjid content, Cloudflare traffic.

## 2. What is measured

| Metric | Limit (Free) | Source | Accuracy |
|---|---|---|---|
| Database size | 500 MB | `pg_database_size()` | Exact |
| File storage | 1 GB | sum of `storage.objects.metadata.size`, bucket `media` | Exact |
| Egress (uncached) | 5 GB / cycle | TV sync responses (counted in `screen_bundle`) + admin share | **Estimate**, corrected by calibration |
| Cached egress | 5 GB / cycle | each new poster/logo × TVs of that masjid seen in the cycle, + all files × newly paired TVs | **Estimate**, corrected by calibration |
| Server load | ~3 req/s on Nano (guide, not a hard Supabase limit) | peak TVs seen in a day ÷ poll seconds | Estimate |
| Emails per day / month | 100 / 3,000 (Resend Free) | Resend `GET /emails`, counted per Malaysian day | Exact (if sync runs) |
| Active users (30 days) | 50,000 MAU | `auth.users.last_sign_in_at` | Exact |

**Why egress is an estimate:** the Supabase Management API exposes request counts but not egress bytes (Usage page and invoices only). So Masjid View counts what it sends, and the owner copies the real "Egress" and "Cached Egress" figures from Supabase → Usage about once a month. The ratio (actual ÷ estimate) becomes a **calibration factor** applied to the estimates for 45 days.

**Definitions**
- *Billing cycle*: starts on `usage_settings.cycle_day` (1–28) each month, Malaysian time. Matches the cycle shown on Supabase's Usage page.
- *Active masjid*: status `active` and at least one TV ping in the period (24 h on the summary; per day in history).
- *Used*: cycle to date (flows) or now (stock: database, storage).
- *Projected*: flows = used ÷ days elapsed × days in cycle. Stock = now + 28-day trend slope × days remaining.
- *Per-masjid rate*: projected ÷ active masjids in the cycle (flows), or now ÷ approved masjids (stock).
- *Runs out at*: limit ÷ per-masjid rate (masjids). *Runs out around*: today + (runs-out-at − active now) ÷ weekly growth, where weekly growth is the least-squares slope of weekly active masjids over the last 12 weeks. Shown as month and year; "> 2 tahun" beyond 104 weeks; "sekarang" if already reached.

## 3. Status rules (same in UI and alert job)

| Level | Rule (per metric) | UI |
|---|---|---|
| `crit` | used ≥ `alert_crit_pct` (90) **or** projected ≥ 100% | red stripe, pill "Tindakan" |
| `warn` | used ≥ `alert_warn_pct` (70) **or** projected ≥ 70% | amber stripe, pill "Perhatian" |
| `ok` | otherwise | green, pill "Selamat" |

Overall verdict = worst metric. **Recommended plan**: Supabase Pro if any Supabase metric is projected ≥ 100% **or** approved masjids ≥ `backup_upgrade_at` (default 25, because Free has no daily backups). Recommended compute: smallest tier whose guide req/s ≥ 1.5 × peak.

## 4. Data flow

```
TV ──screen_bundle (every 60 s)──▶ usage_note_ping() ──▶ usage_screen_daily (1 row / screen / day)
pg_cron hourly ──▶ usage_snapshot() ──▶ usage_daily (1 row / day, kept forever)
pg_cron every 2 days ──pg_net──▶ Edge Function usage-digest
        ├─ Resend GET /emails ──▶ usage_set_emails(day, n) ──▶ usage_email_daily
        └─ usage_report() → levels → usage_mark_alert() → Resend email to owner (first time only)
Owner /admin/platform?tab=penggunaan ──▶ platform_usage()  (JSON)  ──▶ model.ts ──▶ UI
        ├─ form ──▶ usage_calibrate(date, egress_gb, cached_gb)
        └─ form ──▶ usage_update_settings(plan, compute, cycle day, fx, domain …)
```

## 5. Database (see `_specs/32-usage-migration.sql`)

| Object | Purpose |
|---|---|
| `usage_settings` (1 row) | cycle day, plan, compute, Resend plan, poll seconds, HTTP overhead, fx, domain RM/yr, backup threshold, alert %, **limits** and **prices** (jsonb), `prices_checked_on` |
| `usage_screen_daily` | pings, full bundles, estimated bytes per screen per Malaysian day. Trimmed to 120 days by cron |
| `usage_email_daily` | emails sent per Malaysian day (from Resend) |
| `usage_daily` | hourly-refreshed daily snapshot for charts and trends |
| `usage_calibration` | owner-entered actual egress + the estimate at that date |
| `usage_alerts` | which alerts were already emailed this cycle |
| `usage_note_ping()` | called from `screen_bundle`; swallows all errors so the TV can never break |
| `usage_estimate(from, to)` | egress and cached-egress estimate for a date range |
| `usage_report()` | the full JSON (service role) |
| `platform_usage()` | same JSON, platform owner only |
| `usage_calibrate()`, `usage_update_settings()` | owner forms |
| `usage_set_emails()`, `usage_mark_alert()`, `usage_snapshot()` | service role / cron only |

All new tables have RLS on and no policies. Anon can still call only the three TV functions. Measured locally: telemetry adds ~1 ms per `screen_bundle` call; storage cost ≈ 120 days × TVs rows (~10 MB at 1,000 TVs).

**`platform_usage()` JSON shape** (the design file's `REPORT` constant is a full sample):
`generated_at, snapshot_at, settings{…limits, prices}, cycle{start, end, today, days_elapsed, days_total}, live{db_bytes, storage_bytes, storage_objects, mau_30d, screens_total, screens_online, orgs{pending, active, suspended, rejected}, orgs_seen_24h}, cycle_to_date{pings, full_bundles, screens_seen, orgs_seen, peak_screens_day, bundle_bytes, admin_est_bytes, egress_est_bytes, cached_est_bytes, emails_sent, emails_peak_day, emails_today, emails_synced_at}, calibration{measured_on, cycle_start, egress_gb, cached_egress_gb, factor_egress, factor_cached} | null, history[{day, orgs_seen, screens_seen, …}], alerts_sent[]`

## 6. Model (`src/admin/usage/model.ts`)

Pure TypeScript, no React, no fetch; input = `platform_usage()` JSON, output = `{ metrics[], actions[], scale[], weekly[], perWeek, nowUsd, nowRm, needPro, worst, first }`. Port from the `model()` function in `designs/admin/D-Usage.html`. A copy lives at `supabase/functions/_shared/usage-model.ts` (and `usage-types.ts`) for the alert job, made by `npm run sync:usage-model`; a Vitest test fails if the copies differ apart from their one-line "generated" header.

Cost: Free = RM0 + domain. Pro = US$25 + max(0, compute − US$10 credit) + overage (egress US$0.09/GB, cached US$0.03/GB, storage US$0.021/GB, DB US$0.125/GB above Pro quotas). Resend Pro US$20. RM = USD × fx + domain ÷ 12. All prices come from `usage_settings.prices` (never hard-coded in components).

Scale table rows: current active count, then 50 / 100 / 250 / 500 / 1,000 (only those above current). Each row scales this cycle's projected flows by N ÷ active, storage and DB per approved masjid × N, and applies the recommended-plan rule.

## 7. UI (`/admin/platform`, new tab **Penggunaan**, `?tab=penggunaan`)

Match `designs/admin/D-Usage.html` (computer 1440 px; phone 390 px stacks to one column). Sections in order:
1. **Ringkasan strip**: green verdict card (plan · status, RM now, recommendation, cycle dates + day progress) · Masjid aktif · Skrin dalam talian · Had pertama dicapai.
2. **Had pelan Free/Pro**: 8 meter cards: name, status pill, used / limit / %, bar (solid = used, hatched = projected, tick at warn %), projected, runs out at, around when, source line ("Tepat" or "Anggaran ×1.18 (diselaraskan)").
3. **Tindakan disyorkan** (left) · **Pertumbuhan** chart (right): weekly active masjids, last 12 weeks + dashed 12-week projection, endpoint label.
4. **Kos bulanan jika berkembang** table.
5. **Selaraskan dengan angka sebenar** form (date, egress GB, cached GB) + last calibration + 3-step "how to get it".
6. **Pelan dan kadar** form (Supabase plan, compute, Resend plan, cycle day, fx, domain RM/yr) + "prices checked on" line.

Header shows "Dikemas kini HH:MM" and **Muat semula** (re-calls the RPC). Auto-refresh every 5 minutes while the tab is visible. Empty state (< 2 days of data): meters still show exact metrics; flows show "Mengumpul data (hari 1 / 2)"; growth chart shows "Belum cukup data".

Actions rules (ordered: crit, warn, info): one per non-ok metric with its fix; backups (Free and approved ≥ threshold); calibration missing or > 30 days old; email sync older than 50 h (the job runs every 2 days); snapshot older than 2 h; prices checked > 180 days ago; else "Tiada tindakan diperlukan".

All text via `ms.json` / `en.json`. Charts are inline SVG (no chart library). Numbers use `font-variant-numeric: tabular-nums`.

## 8. Alert email (Edge Function `usage-digest`)

Runs every 2 days at 08:07 Malaysian time (`7 0 */2 * *` UTC; owner's choice 2026-10-28: registrations are not daily, so faster alerts are not needed; pg_cron + pg_net, secrets in Vault). An alert can therefore arrive up to 2 days after a limit is crossed. Steps: count Resend emails for the last 3 Malaysian days (covers the gap since the previous run; `usage_set_emails` keeps the larger count) → `usage_set_emails`; get `usage_report()`; compute levels with the shared model; for each metric at warn/crit where `usage_mark_alert(metric, level)` returns true, include it; also include "snapshot stale > 2 h". If anything is included, send one email to `OWNER_EMAIL`:
Subject `Masjid View: Egress 74% (Perhatian)` (worst item first). Body: each item with used, projected and the action line, plus a link to `https://masjidview.my/admin/platform?tab=penggunaan`.
Auth: header `x-cron-secret` must equal secret `CRON_SECRET`; deployed with `--no-verify-jwt`. Never logs keys.

## 9. Security and privacy

- Only `is_platform_admin()` can read usage or change settings. No masjid names, content or personal data appear in the report (counts only).
- The service-role key is used only inside the Edge Function (provided by Supabase). Nothing new in `NEXT_PUBLIC_*`.
- No Supabase Management API personal access token is stored anywhere (it would have full account rights).

## 10. Acceptance criteria

1. Migration applied on dev and prod; `npm run rls-check` still all PASS, plus new lines: anon cannot call `platform_usage`, `usage_note_ping`, `usage_report`; a non-owner gets `not_allowed`; the owner gets JSON.
2. A paired TV keeps syncing normally; `usage_screen_daily` gains 1 ping per minute per TV; renaming the table temporarily does not break the TV (tested on dev only).
3. Database size and file storage on the tab match Supabase → Usage within 5%.
4. After entering one calibration, the egress meter shows "Anggaran ×F (diselaraskan)" and the value equals estimate × F.
5. Changing the plan to Pro in "Pelan dan kadar" switches limits to Pro values and the cost line to ≥ US$25 × fx + domain.
6. `usage-digest` invoked by hand: updates `usage_email_daily` for today; with the Free database limit temporarily set to 1 MB (prompt U3 check), sends exactly one email; a second run sends none.
7. Vitest covers `model.ts`: projection, levels at 69/70/90/100%, runs-out-at, weekly slope, cost with and without overage, scale rows, actions (each rule), empty data. The `_shared` copy is identical.
8. Tab usable at 360 px and 1440 px; BM and EN; tap targets ≥ 44 px; `npm test` and `npm run build` pass.

## 11. Later

Cloudflare Web Analytics (Trafik tab) · per-masjid usage table (Masjid tab) · Telegram alerts · reading cached egress per object from Storage logs.
