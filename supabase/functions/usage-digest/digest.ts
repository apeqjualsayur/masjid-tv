// Logic of the `usage-digest` Edge Function (_specs/30-PRD-usage.md §8). Pure: no Deno, no network,
// so it is unit-tested with Vitest (digest.test.ts). index.ts does the fetching and sending.
import type { Level, MetricKey, UsageMetric, UsageModel } from "../_shared/usage-model.ts";

const MYT_MS = 8 * 3_600_000; // Malaysia is UTC+8 all year
const DAY_MS = 86_400_000;

/** Malaysian calendar date 'YYYY-MM-DD' of an instant (ms since epoch). */
export const myDate = (ms: number) => new Date(ms + MYT_MS).toISOString().slice(0, 10);
/** Instant of 00:00 Malaysian time on a 'YYYY-MM-DD'. */
export const myMidnight = (ymd: string) => Date.parse(`${ymd}T00:00:00Z`) - MYT_MS;

/** Malaysian today and yesterday, and the instant counting starts from (00:00 yesterday). */
export function countWindow(nowMs: number): { today: string; yesterday: string; fromMs: number } {
  const today = myDate(nowMs);
  const yesterday = myDate(myMidnight(today) - DAY_MS);
  return { today, yesterday, fromMs: myMidnight(yesterday) };
}

/** Resend's created_at looks like "2026-10-28 02:13:55.977+00"; also accepts ISO. NaN when unreadable. */
export function parseResendTime(s: string): number {
  const iso = s.trim().replace(" ", "T").replace(/([+-]\d\d)$/, "$1:00");
  return Date.parse(iso);
}

export interface ResendListPage {
  data?: { id: string; created_at: string }[];
  has_more?: boolean;
}

/**
 * Adds one page (newest first) to the per-day counts. Returns the id to continue after,
 * or null when done (no more pages, or the page reached emails older than fromMs).
 */
export function addPage(counts: Record<string, number>, page: ResendListPage, fromMs: number): string | null {
  const rows = page.data ?? [];
  let older = false;
  for (const e of rows) {
    const t = parseResendTime(e.created_at);
    if (!Number.isFinite(t)) continue;
    if (t < fromMs) {
      older = true;
      continue;
    }
    const day = myDate(t);
    counts[day] = (counts[day] ?? 0) + 1;
  }
  if (older || !page.has_more || rows.length === 0) return null;
  return rows[rows.length - 1].id;
}

// ---------------------------------------------------------------------------- alerts

export type AlertMetric = MetricKey | "snapshot";
export interface AlertItem {
  metric: AlertMetric;
  level: Exclude<Level, "ok">;
  /** null for 'snapshot'. */
  m: UsageMetric | null;
  /** snapshot: hours since the last snapshot, null = never. */
  hours?: number | null;
}

/** Everything that is at warn or crit now, worst first; plus 'snapshot' when it is older than 2 hours. */
export function alertCandidates(u: UsageModel): AlertItem[] {
  const items: AlertItem[] = u.metrics
    .filter((m) => m.level !== "ok")
    .map((m) => ({ metric: m.key, level: m.level as "warn" | "crit", m }));
  const snap = u.actions.find((a) => a.code === "snapshot");
  if (snap) items.push({ metric: "snapshot", level: "warn", m: null, hours: snap.hours ?? null });
  return items.sort((a, b) => (a.level === b.level ? (b.m?.projPct ?? 0) - (a.m?.projPct ?? 0) : a.level === "crit" ? -1 : 1));
}

export const METRIC_NAME: Record<AlertMetric, string> = {
  egress: "Egress",
  cached: "Egress cache (poster)",
  db: "Pangkalan data",
  storage: "Storan fail",
  rps: "Beban pelayan",
  email_day: "Emel sehari (puncak)",
  email_month: "Emel sebulan",
  mau: "Pengguna aktif (30 hari)",
  snapshot: "Snapshot penggunaan",
};

const ACTION: Record<AlertMetric, string> = {
  egress: "Ubah selang semakan TV kepada 120 s antara Isyak dan Subuh, atau naik taraf ke Supabase Pro.",
  cached: "Pindahkan poster ke Cloudflare R2 (tiada caj egress), atau naik taraf ke Supabase Pro.",
  db: "Semak jadual usage_screen_daily dipangkas (120 hari) dan kandungan lama dipadam, atau naik taraf ke Supabase Pro.",
  storage: "Padam poster yang tamat lebih 30 hari, atau naik taraf ke Supabase Pro.",
  rps: "Naik taraf saiz compute di Supabase → Settings → Compute, kemudian kemas kini \"Saiz compute\" di tab Penggunaan.",
  email_day: "Galakkan AJK log masuk dengan Google (tiada emel), atau naik taraf ke Resend Pro.",
  email_month: "Naik taraf ke Resend Pro.",
  mau: "Naik taraf ke Supabase Pro.",
  snapshot: "Tugas cron masjidview-usage-snapshot tidak berjalan. Semak Supabase → Integrations → Cron.",
};

const LEVEL_NAME = { warn: "Perhatian", crit: "Tindakan" } as const;

/** 1000-based like Supabase's usage page: "850 MB", "3.7 GB". */
export function fmtValue(v: number, unit: UsageMetric["unit"]): string {
  if (unit === "rps") return `${v.toFixed(2)} permintaan/s`;
  if (unit === "count") return Math.round(v).toLocaleString("en-US");
  if (v >= 1e9) return `${(v / 1e9).toFixed(v >= 1e10 ? 0 : 2)} GB`;
  return `${(v / 1e6).toFixed(v >= 1e8 ? 0 : 1)} MB`;
}

export function itemLine(i: AlertItem): string {
  const name = METRIC_NAME[i.metric];
  if (!i.m) {
    const ago = i.hours == null ? "belum pernah berjalan" : `terakhir ${Math.round(i.hours)} jam lalu`;
    return `${name} (${LEVEL_NAME[i.level]}): ${ago}. ${ACTION[i.metric]}`;
  }
  const m = i.m;
  return `${name} (${LEVEL_NAME[i.level]}): ${fmtValue(m.used, m.unit)} / ${fmtValue(m.limit, m.unit)} (${Math.round(m.usedPct)}%), `
    + `unjuran akhir kitaran ${fmtValue(m.proj, m.unit)} (${Math.round(m.projPct)}%). ${ACTION[i.metric]}`;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export interface DigestEmail {
  subject: string;
  text: string;
  html: string;
}

/** One email for all new items (worst first). Subject: "Masjid View: Egress 74% (Perhatian)". */
export function digestEmail(items: AlertItem[], link: string): DigestEmail {
  const w = items[0];
  const head = w.m ? `${METRIC_NAME[w.metric]} ${Math.round(w.m.usedPct)}%` : `${METRIC_NAME[w.metric]} terhenti`;
  const subject = `Masjid View: ${head} (${LEVEL_NAME[w.level]})`;
  const lines = items.map(itemLine);
  const text = ["Penggunaan Masjid View perlu perhatian:", "", ...lines.map((l) => `- ${l}`), "", `Lihat butiran: ${link}`, ""].join("\n");
  const html = `<!doctype html><html><body style="margin:0;background:#F4F7F5;font-family:Arial,Helvetica,sans-serif;color:#12261E">
<div style="max-width:560px;margin:0 auto;padding:24px 20px">
<div style="font-size:14px;font-weight:700;color:#146C4A;margin-bottom:12px">Masjid View</div>
<div style="background:#FFFFFF;border-radius:16px;padding:22px">
<h1 style="font-size:20px;margin:0 0 14px">Penggunaan perlu perhatian</h1>
<ul style="padding-left:18px;margin:0 0 12px">${lines.map((l) => `<li style="font-size:15px;line-height:1.55;margin:0 0 10px">${escapeHtml(l)}</li>`).join("")}</ul>
<p style="margin:18px 0 4px"><a href="${escapeHtml(link)}" style="display:inline-block;background:#146C4A;color:#FFFFFF;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:12px">Buka tab Penggunaan</a></p>
</div></div></body></html>`;
  return { subject, text, html };
}

/** Constant-time string comparison for the x-cron-secret header. */
export function sameSecret(given: string | null, expected: string): boolean {
  if (!given || !expected || given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
