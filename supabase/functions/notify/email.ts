// E-mails sent by the `notify` Edge Function (PRD Phase 2 §4.3). Pure: no Deno, no network,
// so the rules and texts are unit-tested with Vitest (email.test.ts).

export type NotifyType = "registered" | "reviewed";
export type Lang = "ms" | "en";

export interface OrgForEmail {
  id: string;
  kind: "masjid" | "surau";
  full_name: string;
  short_name: string;
  state: string;
  district: string;
  zone: string;
  contact_phone: string | null;
  status: "pending" | "active" | "rejected" | "suspended";
  status_reason: string | null;
  created_by: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export interface Email {
  to: string[];
  subject: string;
  html: string;
  text: string;
  /** Resend Idempotency-Key: the same event never sends twice. */
  idempotencyKey: string;
}

/** Only events this recent may send (stops replaying old events to spam inboxes). */
export const FRESH_MS = 15 * 60_000;

export type Decision = { ok: true } | { ok: false; status: number; error: string };

/**
 * Who may trigger what:
 * - registered: the user who created the org, while it is pending and was created in the last 15 min;
 * - reviewed: a platform owner, for an org approved or rejected in the last 15 min.
 */
export function mayNotify(type: NotifyType, org: OrgForEmail, callerId: string, callerIsOwner: boolean, now: number): Decision {
  if (type === "registered") {
    if (org.created_by !== callerId) return { ok: false, status: 403, error: "not_registrant" };
    if (org.status !== "pending") return { ok: false, status: 409, error: "not_pending" };
    if (now - Date.parse(org.created_at) > FRESH_MS) return { ok: false, status: 409, error: "too_old" };
    return { ok: true };
  }
  if (!callerIsOwner) return { ok: false, status: 403, error: "not_owner" };
  if (org.status !== "active" && org.status !== "rejected") return { ok: false, status: 409, error: "not_decided" };
  if (!org.reviewed_at || now - Date.parse(org.reviewed_at) > FRESH_MS) return { ok: false, status: 409, error: "too_old" };
  return { ok: true };
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const wrap = (title: string, rows: string) => `<!doctype html><html><body style="margin:0;background:#F4F7F5;font-family:Arial,Helvetica,sans-serif;color:#12261E">
<div style="max-width:520px;margin:0 auto;padding:24px 20px">
<div style="font-size:14px;font-weight:700;color:#146C4A;margin-bottom:12px">Masjid View</div>
<div style="background:#FFFFFF;border-radius:16px;padding:22px">
<h1 style="font-size:20px;margin:0 0 14px">${title}</h1>
${rows}
</div></div></body></html>`;
const p = (s: string) => `<p style="font-size:15px;line-height:1.55;margin:0 0 12px">${s}</p>`;
const button = (href: string, label: string) =>
  `<p style="margin:18px 0 4px"><a href="${escapeHtml(href)}" style="display:inline-block;background:#146C4A;color:#FFFFFF;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:12px">${escapeHtml(label)}</a></p>`;

/** (a) New registration → platform owners (BM). */
export function ownerEmail(org: OrgForEmail, registrantEmail: string | null, ownerEmails: string[], appUrl: string): Email {
  const link = `${appUrl}/admin/platform/`;
  const kind = org.kind === "surau" ? "Surau" : "Masjid";
  const lines: [string, string][] = [
    ["Nama", org.full_name],
    ["Jenis", kind],
    ["Lokasi", `${org.district}, ${org.state} · ${org.zone}`],
    ["Didaftar oleh", registrantEmail ?? "-"],
    ["Telefon", org.contact_phone ?? "-"],
  ];
  const table = `<table style="font-size:14px;border-collapse:collapse;margin:0 0 6px">${lines
    .map(([k, v]) => `<tr><td style="color:#51655C;padding:3px 14px 3px 0;vertical-align:top">${k}</td><td style="font-weight:700;padding:3px 0">${escapeHtml(v)}</td></tr>`)
    .join("")}</table>`;
  return {
    to: ownerEmails,
    subject: `Pendaftaran baharu: ${org.full_name}`,
    html: wrap("Pendaftaran baharu menunggu kelulusan", table + button(link, "Buka halaman Platform")),
    text: `Pendaftaran baharu menunggu kelulusan.\n\n${lines.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\nBuka: ${link}`,
    idempotencyKey: `registered-${org.id}`,
  };
}

/** (b) Approved / rejected → the registrant, in their app language. */
export function decisionEmail(org: OrgForEmail, to: string, lang: Lang, appUrl: string): Email {
  const admin = `${appUrl}/admin/`;
  const tv = `${appUrl.replace(/^https?:\/\//, "")}/tv`;
  const name = org.full_name;
  const en = lang === "en";
  const key = `reviewed-${org.id}-${org.status}-${org.reviewed_at ?? ""}`;
  const cta = en ? "Open Masjid View" : "Buka Masjid View";
  let subject: string, title: string, paras: string[];
  if (org.status === "active") {
    subject = en ? `${name} has been approved` : `${name} telah diluluskan`;
    title = en ? "Registration approved" : "Pendaftaran diluluskan";
    paras = en
      ? [`${name} is now active on Masjid View.`, `Next: open ${tv} on the masjid TV to get a pairing code, then add the screen in the app under Screens.`]
      : [`${name} kini aktif di Masjid View.`, `Seterusnya: buka ${tv} pada TV masjid untuk mendapatkan kod pemasangan, kemudian tambah skrin dalam aplikasi di bahagian Skrin.`];
  } else {
    const reason = org.status_reason?.trim() || "-";
    subject = en ? `Registration of ${name} was not approved` : `Pendaftaran ${name} tidak diluluskan`;
    title = en ? "Registration not approved" : "Pendaftaran tidak diluluskan";
    paras = en
      ? [`The registration of ${name} was not approved.`, `Reason: ${reason}`, "You can correct the details and register again."]
      : [`Pendaftaran ${name} tidak diluluskan.`, `Sebab: ${reason}`, "Anda boleh membetulkan butiran dan mendaftar semula."];
  }
  return {
    to: [to],
    subject,
    html: wrap(escapeHtml(title), paras.map((x) => p(escapeHtml(x))).join("") + button(admin, cta)),
    text: `${title}\n\n${paras.join("\n\n")}\n\n${admin}`,
    idempotencyKey: key,
  };
}
