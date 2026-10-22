// Supabase Edge Function `notify` (Deno). Sends PRD §4.3 e-mails through Resend:
//   POST { "type": "registered", "org_id": "…" }  → platform owners: new registration
//   POST { "type": "reviewed",   "org_id": "…" }  → registrant: approved / rejected
// The app calls it after register_org / review_org succeed. It checks the caller itself
// (deployed with --no-verify-jwt so the browser's CORS preflight works), reads data with the
// service role that Supabase injects, and never returns e-mail addresses.
// Secrets: RESEND_API_KEY (required), NOTIFY_FROM (default "Masjid View <onboarding@resend.dev>"),
//          APP_URL (default https://masjidview.my).
import { createClient } from "npm:@supabase/supabase-js@2";
import { decisionEmail, mayNotify, ownerEmail, type Email, type Lang, type NotifyType, type OrgForEmail } from "./email.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = Deno.env.get("NOTIFY_FROM") ?? "Masjid View <onboarding@resend.dev>";
const APP_URL = (Deno.env.get("APP_URL") ?? "https://masjidview.my").replace(/\/+$/, "");

async function send(mail: Email): Promise<{ ok: boolean; status: number }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": mail.idempotencyKey },
    body: JSON.stringify({ from: FROM, to: mail.to, subject: mail.subject, html: mail.html, text: mail.text }),
  });
  if (!res.ok) console.error("resend", res.status, await res.text());
  return { ok: res.ok, status: res.status };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });
  if (!RESEND_API_KEY) return json(503, { error: "not_configured" });

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: who, error: authError } = await admin.auth.getUser(token);
  if (authError || !who.user) return json(401, { error: "not_signed_in" });

  let body: { type?: NotifyType; org_id?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "bad_json" });
  }
  if ((body.type !== "registered" && body.type !== "reviewed") || typeof body.org_id !== "string") return json(400, { error: "bad_request" });

  const { data: org } = await admin
    .from("organisations")
    .select("id, kind, full_name, short_name, state, district, zone, contact_phone, status, status_reason, created_by, created_at, reviewed_at")
    .eq("id", body.org_id)
    .maybeSingle();
  if (!org) return json(404, { error: "not_found" });

  const { data: owners } = await admin.from("platform_admins").select("user_id");
  const ownerIds = (owners ?? []).map((o) => o.user_id as string);
  const decision = mayNotify(body.type, org as OrgForEmail, who.user.id, ownerIds.includes(who.user.id), Date.now());
  if (!decision.ok) return json(decision.status, { error: decision.error });

  const emailOf = async (id: string | null) => (id ? ((await admin.auth.admin.getUserById(id)).data.user?.email ?? null) : null);

  let mail: Email;
  if (body.type === "registered") {
    const to = (await Promise.all(ownerIds.map(emailOf))).filter((e): e is string => Boolean(e));
    if (to.length === 0) return json(200, { sent: 0 });
    mail = ownerEmail(org as OrgForEmail, await emailOf(org.created_by), to, APP_URL);
  } else {
    const to = await emailOf(org.created_by);
    if (!to) return json(200, { sent: 0 });
    const { data: profile } = await admin.from("profiles").select("lang").eq("user_id", org.created_by).maybeSingle();
    mail = decisionEmail(org as OrgForEmail, to, (profile?.lang as Lang) ?? "ms", APP_URL);
  }
  const r = await send(mail);
  return r.ok ? json(200, { sent: mail.to.length }) : json(502, { error: "send_failed", status: r.status });
});