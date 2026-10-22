// Kandungan rules (designs/admin/Content + D-Content). Pure: no React, no Supabase.
import { localParts } from "@/core";
import { slideTitle, type TemplateKey } from "@/templates";

export type SlideStatus = "draft" | "published" | "paused";
export type Tab = "aktif" | "dijadual" | "tamat";
export const TABS: Tab[] = ["aktif", "dijadual", "tamat"];

export interface ContentRow {
  id: string;
  type: "poster" | "template";
  template_key: TemplateKey | null;
  fields: Record<string, unknown>;
  media_id: string | null;
  status: SlideStatus;
  starts_at: string;
  ends_at: string | null;
  duration_s: number;
  days_of_week: number[] | null;
  priority: boolean;
  sort_order: number;
  screen_ids: string[] | null;
  created_at: string;
  media?: { path: string } | null;
}

/**
 * Aktif: published or paused, started and not ended (paused ones show with the switch off).
 * Dijadual: drafts, and published/paused slides that start later. Tamat: ended.
 */
export function tabOf(r: Pick<ContentRow, "status" | "starts_at" | "ends_at">, now: number): Tab {
  if (r.ends_at && Date.parse(r.ends_at) <= now) return "tamat";
  if (r.status === "draft" || Date.parse(r.starts_at) > now) return "dijadual";
  return "aktif";
}

export function countTabs(rows: ContentRow[], now: number): Record<Tab, number> {
  const c: Record<Tab, number> = { aktif: 0, dijadual: 0, tamat: 0 };
  for (const r of rows) c[tabOf(r, now)]++;
  return c;
}

/** Playlist order, the same as the TV bundle: sort_order, then created_at. */
export const byOrder = (a: ContentRow, b: ContentRow) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at);

export function titleOf(r: ContentRow): string {
  return slideTitle(r.type === "poster" ? "poster" : r.template_key, r.fields) || "";
}

const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Rows of a tab, in playlist order, matching the search text and the screen filter. */
export function visibleRows(rows: ContentRow[], tab: Tab, now: number, query = "", screenId: string | null = null, typeName: (r: ContentRow) => string = () => ""): ContentRow[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  return rows
    .filter((r) => tabOf(r, now) === tab)
    .filter((r) => !screenId || r.screen_ids === null || r.screen_ids.includes(screenId))
    .filter((r) => {
      if (!words.length) return true;
      const hay = fold(`${titleOf(r)} ${typeName(r)}`);
      return words.every((w) => hay.includes(w));
    })
    .sort(byOrder);
}

export function move<T>(list: T[], from: number, to: number): T[] {
  const out = [...list];
  const [x] = out.splice(from, 1);
  out.splice(Math.max(0, Math.min(out.length, to)), 0, x);
  return out;
}

/**
 * New order for ALL slides after reordering a visible subset (a tab, maybe filtered): the subset's
 * slots in the full list keep their places, filled with the subset in its new order.
 */
export function applyReorder(all: ContentRow[], visibleNewOrder: string[]): string[] {
  const full = [...all].sort(byOrder).map((r) => r.id);
  const moved = new Set(visibleNewOrder);
  const queue = [...visibleNewOrder];
  return full.map((id) => (moved.has(id) ? queue.shift()! : id));
}

// ------------------------------------------------------------------ labels (data for the UI)

const BULAN_PENDEK = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogo", "Sep", "Okt", "Nov", "Dis"];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "19 Okt" in Malaysia time. */
export function shortDate(iso: string, lang: "ms" | "en" = "ms"): string {
  const p = localParts(Date.parse(iso));
  return `${p.day} ${(lang === "en" ? MONTH_SHORT : BULAN_PENDEK)[p.month - 1]}`;
}

export type DateLabel =
  | { kind: "range"; from: string; to: string }
  | { kind: "until"; to: string }
  | { kind: "ongoing" }
  | { kind: "starts"; from: string }
  | { kind: "ended"; to: string };

/** Aktif: "Hingga 20 Okt" / "Berterusan"; Dijadual: "Mula 1 Nov"; Tamat: "Tamat 12 Okt". Computer: "19 – 22 Okt". */
export function dateLabel(r: Pick<ContentRow, "starts_at" | "ends_at" | "status">, now: number, wide: boolean, lang: "ms" | "en" = "ms"): DateLabel {
  const from = shortDate(r.starts_at, lang);
  const to = r.ends_at ? shortDate(r.ends_at, lang) : null;
  if (wide) {
    if (!to) return Date.parse(r.starts_at) > now ? { kind: "starts", from } : { kind: "ongoing" };
    // Same month: "19 – 22 Okt"
    const sameMonth = from.split(" ")[1] === to.split(" ")[1];
    return { kind: "range", from: sameMonth ? from.split(" ")[0] : from, to };
  }
  const tab = tabOf(r, now);
  if (tab === "tamat") return { kind: "ended", to: to ?? from };
  if (tab === "dijadual") return { kind: "starts", from };
  return to ? { kind: "until", to } : { kind: "ongoing" };
}

/** Days left until a Kematian notice ends ("Tamat auto: 3 hari"), at least 1 while running. */
export function daysLeft(endsAt: string | null, now: number): number | null {
  if (!endsAt) return null;
  return Math.max(1, Math.ceil((Date.parse(endsAt) - now) / 86_400_000));
}

/** Database weekdays (1 = Isnin … 7 = Ahad); null/empty/all = every day. */
export function daysLabel(days: number[] | null, short: (d: number) => string): string | null {
  if (!days || days.length === 0 || days.length === 7) return null;
  return [...days].sort((a, b) => a - b).map(short).join(", ");
}

export function screensLabel(ids: string[] | null, screens: { id: string; name: string }[]): string | null {
  if (!ids) return null;
  return ids.map((id) => screens.find((s) => s.id === id)?.name).filter(Boolean).join(", ") || null;
}

/** Switch: on = shown on the TV (published). Draft → on publishes it; paused ↔ published. */
export function toggledStatus(s: SlideStatus): SlideStatus {
  return s === "published" ? "paused" : "published";
}

/** Copy as a draft right after the original (same order slot, newer created_at sorts after). */
export function duplicateRow(r: ContentRow, orgId: string): Record<string, unknown> {
  return {
    org_id: orgId,
    type: r.type,
    template_key: r.template_key,
    fields: r.fields,
    media_id: r.media_id,
    status: "draft",
    starts_at: r.starts_at,
    ends_at: r.ends_at,
    duration_s: r.duration_s,
    days_of_week: r.days_of_week,
    priority: r.priority,
    sort_order: r.sort_order,
    screen_ids: r.screen_ids,
  };
}