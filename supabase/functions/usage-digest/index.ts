// Supabase Edge Function `usage-digest` (Deno), _specs/30-PRD-usage.md §8. Called every 2 days by
// pg_cron + pg_net (secrets in Vault), or by hand with curl:
//   1. counts Resend emails for the last 3 Malaysian days → usage_set_emails
//   2. usage_report() → shared usage model → usage_mark_alert(metric, level) for each warn/crit item
//      (true only the first time per billing cycle), plus 'snapshot' when it is older than 2 hours
//   3. new items → ONE email to OWNER_EMAIL
// Auth: header x-cron-secret = secret CRON_SECRET. Deployed with --no-verify-jwt.
// Secrets: CRON_SECRET, OWNER_EMAIL, RESEND_API_KEY and NOTIFY_FROM (shared with `notify`), APP_URL (optional).
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY come from the Edge runtime. Never logs keys or addresses.
import { createClient } from "npm:@supabase/supabase-js@2";
import { model } from "../_shared/usage-model.ts";
import type { UsageReport } from "../_shared/usage-types.ts";
import { addPage, alertCandidates, countWindow, digestEmail, sameSecret, type AlertItem, type ResendListPage } from "./digest.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const OWNER_EMAIL = Deno.env.get("OWNER_EMAIL") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = Deno.env.get("NOTIFY_FROM") ?? "Masjid View <onboarding@resend.dev>";
const APP_URL = (Deno.env.get("APP_URL") ?? "https://masjidview.my").replace(/\/+$/, "");
const MAX_PAGES = 50;

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Emails sent per Malaysian day over the count window, or null when Resend could not be read. */
async function countEmails(nowMs: number): Promise<{ days: string[]; counts: Record<string, number> } | null> {
  if (!RESEND_API_KEY) {
    console.error("resend list: RESEND_API_KEY not set");
    return null;
  }
  const w = countWindow(nowMs);
  const counts: Record<string, number> = {};
  let after: string | null = "";
  for (let page = 0; after !== null; page++) {
    if (page >= MAX_PAGES) {
      console.error("resend list: stopped after", MAX_PAGES, "pages");
      break;
    }
    if (page > 0) await sleep(600);
    const url = `https://api.resend.com/emails?limit=100${after ? `&after=${encodeURIComponent(after)}` : ""}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${RESEND_API_KEY}` } });
    if (!res.ok) {
      console.error("resend list", res.status);
      await res.body?.cancel();
      return null;
    }
    after = addPage(counts, (await res.json()) as ResendListPage, w.fromMs);
  }
  return { days: w.days, counts };
}

Deno.serve(async (req) => {
  if (!sameSecret(req.headers.get("x-cron-secret"), CRON_SECRET)) return new Response(null, { status: 401 });

  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

  // 1. Email counts
  let emailsCounted: number | null = null;
  const em = await countEmails(Date.now());
  if (em) {
    emailsCounted = 0;
    for (const day of em.days) {
      const n = em.counts[day] ?? 0;
      emailsCounted += n;
      const { error } = await db.rpc("usage_set_emails", { p_day: day, p_sent: n });
      if (error) console.error("usage_set_emails", error.code);
    }
  }

  // 2. Alerts
  const { data: report, error: repErr } = await db.rpc("usage_report");
  if (repErr || !report) {
    console.error("usage_report", repErr?.code);
    return json(500, { emails_counted: emailsCounted, alerts_sent: 0, error: "report_failed" });
  }
  if (!OWNER_EMAIL || !RESEND_API_KEY) {
    // Do not mark alerts that cannot be emailed: they would be lost for the rest of the cycle.
    console.error("alerts: OWNER_EMAIL or RESEND_API_KEY not set");
    return json(200, { emails_counted: emailsCounted, alerts_sent: 0, error: "not_configured" });
  }
  const r = report as UsageReport;
  const fresh: AlertItem[] = [];
  for (const item of alertCandidates(model(r))) {
    const { data: first, error } = await db.rpc("usage_mark_alert", { p_metric: item.metric, p_level: item.level });
    if (error) console.error("usage_mark_alert", error.code);
    else if (first === true) fresh.push(item);
  }
  if (!fresh.length) return json(200, { emails_counted: emailsCounted, alerts_sent: 0 });

  // 3. One email
  const mail = digestEmail(fresh, `${APP_URL}/admin/platform?tab=penggunaan`);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [OWNER_EMAIL], subject: mail.subject, text: mail.text, html: mail.html }),
  });
  await res.body?.cancel();
  if (!res.ok) {
    console.error("resend send", res.status);
    // Un-mark so the next run tries again.
    for (const i of fresh) await db.from("usage_alerts").delete().match({ cycle_start: r.cycle.start, metric: i.metric, level: i.level });
    return json(502, { emails_counted: emailsCounted, alerts_sent: 0, error: "send_failed" });
  }
  return json(200, { emails_counted: emailsCounted, alerts_sent: fresh.length });
});
