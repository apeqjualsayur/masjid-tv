// Platform page rules (PRD Phase 2 §4.3, designs/admin/Admin). Pure: no React, no Supabase.
import type { OrgStatus } from "../routing";

/** One row of public.platform_org_list() (migration 0003). */
export interface PlatformOrg {
  id: string;
  kind: "masjid" | "surau";
  full_name: string;
  short_name: string;
  state: string;
  district: string;
  zone: string;
  address: string | null;
  contact_phone: string | null;
  logo_path: string | null;
  accent_color: string;
  status: OrgStatus;
  status_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
  registrant_email: string | null;
  screens_total: number;
  screens_online: number;
  storage_bytes: number;
}

export type PlatformTab = "pending" | "active" | "suspended";
export const TABS: PlatformTab[] = ["pending", "active", "suspended"];

/** All tabs of /admin/platform: the three org lists plus Penggunaan (usage, PRD usage §7) and Maklum balas (feedback). */
export type ViewTab = PlatformTab | "usage" | "feedback";
export const VIEW_TABS: ViewTab[] = [...TABS, "usage", "feedback"];
/** ?tab= value per tab. */
export const TAB_QUERY: Record<ViewTab, string> = { pending: "pending", active: "active", suspended: "suspended", usage: "penggunaan", feedback: "maklum-balas" };

/** The tab named by ?tab= (BM or English names accepted); Menunggu when missing or unknown. */
export function tabFromQuery(value: string | null | undefined): ViewTab {
  const v = (value ?? "").trim().toLowerCase();
  if (v === "penggunaan" || v === "usage") return "usage";
  if (v === "maklum-balas" || v === "feedback") return "feedback";
  if (v === "active" || v === "aktif") return "active";
  if (v === "suspended" || v === "digantung") return "suspended";
  return "pending";
}

/** Rejected registrations sit with the suspended ones: both can be reactivated. */
export function tabOf(status: OrgStatus): PlatformTab {
  return status === "pending" ? "pending" : status === "active" ? "active" : "suspended";
}

export type ReviewAction = "approve" | "reject" | "suspend" | "reactivate";

/** Buttons per status, in display order (secondary first, primary last). */
export function actionsFor(status: OrgStatus): ReviewAction[] {
  if (status === "pending") return ["reject", "approve"];
  if (status === "active") return ["suspend"];
  return ["reactivate"];
}

export const needsReason = (a: ReviewAction) => a === "reject" || a === "suspend";
export const REASON_MAX = 500;

/** i18n key of the problem with a reason, or null when it can be sent. */
export function reasonError(action: ReviewAction, reason: string): string | null {
  if (!needsReason(action)) return null;
  const r = reason.trim();
  if (!r) return "platform.reasonRequired";
  if (r.length > REASON_MAX) return "platform.reasonTooLong";
  return null;
}

export interface PlatformTotals {
  active: number;
  pending: number;
  screensOnline: number;
  screensTotal: number;
  storageBytes: number;
}

/** Header numbers. Screens count for active masjids only (others' TVs cannot sync). */
export function totals(orgs: PlatformOrg[]): PlatformTotals {
  const t: PlatformTotals = { active: 0, pending: 0, screensOnline: 0, screensTotal: 0, storageBytes: 0 };
  for (const o of orgs) {
    if (o.status === "active") {
      t.active++;
      t.screensOnline += o.screens_online;
      t.screensTotal += o.screens_total;
    }
    if (o.status === "pending") t.pending++;
    t.storageBytes += Number(o.storage_bytes) || 0;
  }
  return t;
}

export function countByTab(orgs: PlatformOrg[]): Record<PlatformTab, number> {
  const c: Record<PlatformTab, number> = { pending: 0, active: 0, suspended: 0 };
  for (const o of orgs) c[tabOf(o.status)]++;
  return c;
}

const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Orgs of one tab matching a search over name, area, zone, e-mail and phone. Pending: oldest first. */
export function filterOrgs(orgs: PlatformOrg[], tab: PlatformTab, query: string): PlatformOrg[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  const list = orgs.filter((o) => {
    if (tabOf(o.status) !== tab) return false;
    if (words.length === 0) return true;
    const hay = fold([o.full_name, o.short_name, o.district, o.state, o.zone, o.registrant_email ?? "", o.contact_phone ?? ""].join(" "));
    return words.every((w) => hay.includes(w));
  });
  return tab === "pending" ? [...list].sort((a, b) => a.created_at.localeCompare(b.created_at)) : list;
}

/** "0 B", "850 KB", "12.4 MB", "1.2 GB" (1000-based, as Supabase reports usage). */
export function formatBytes(bytes: number, locale = "ms-MY"): string {
  const n = Math.max(0, Number(bytes) || 0);
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = n;
  while (v >= 1000 && i < units.length - 1) {
    v /= 1000;
    i++;
  }
  const digits = i === 0 || v >= 100 ? 0 : 1;
  return `${v.toLocaleString(locale, { maximumFractionDigits: digits, minimumFractionDigits: 0 })} ${units[i]}`;
}