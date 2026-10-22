// Skrin rules (PRD Phase 2 §4.4, designs/admin/Screens). Pure: no React, no Supabase.
import { isOnline, offlineFor } from "../home/logic";

export const THEMES = ["alam", "serambi", "tenang"] as const;
export const LAYOUTS = ["full", "bottom", "side"] as const;
export type Theme = (typeof THEMES)[number];
export type Layout = (typeof LAYOUTS)[number];
export const NAME_MAX = 60;

export interface Screen {
  id: string;
  name: string;
  theme: Theme;
  layout: Layout;
  last_seen_at: string | null;
  revoked_at: string | null;
  app_version: string | null;
  created_at: string;
}

/** Digits only, at most 6. */
export const onlyDigits = (s: string, max = 6) => s.replace(/\D/g, "").slice(0, max);

/** A pasted text: the first run of 6 digits ("Kod: 482 913" → "482913"), else its digits. */
export function codeFromPaste(text: string): string {
  const compact = text.replace(/[\s-]/g, "");
  const m = compact.match(/\d{6}/);
  return m ? m[0] : onlyDigits(text);
}

/** Code from a QR scan kept across sign-in (the sign-in page sends the user back to Skrin). */
export const PENDING_PAIR_KEY = "mv:pair";

/** ?pair=482913 from the QR link. */
export function codeFromQuery(search: string): string | null {
  const v = new URLSearchParams(search).get("pair");
  return v && /^\d{6}$/.test(v) ? v : null;
}

/** i18n key for a screen name problem, or null. */
export function nameError(name: string): string | null {
  const n = [...name.trim()].length;
  if (n === 0) return "screens.err.nameRequired";
  if (n > NAME_MAX) return "screens.err.nameLength";
  return null;
}

/**
 * pair_claim: a screen id on success; NULL for a wrong or expired code (migration 0002 records the
 * attempt instead of raising). Errors: too_many_attempts, not_allowed, network.
 */
export function claimErrorKey(data: unknown, error: { message?: string; code?: string } | null): string | null {
  if (error) {
    const m = error.message ?? "";
    if (m.includes("too_many_attempts")) return "screens.err.tooManyAttempts";
    if (m.includes("invalid_code")) return "screens.err.invalidCode";
    if (m.includes("not_allowed") || error.code === "42501") return "screens.err.notAllowed";
    if (/failed to fetch|network|load failed/i.test(m)) return "screens.err.network";
    return "screens.err.generic";
  }
  return typeof data === "string" && data ? null : "screens.err.invalidCode";
}

export type ScreenStatus = { kind: "online" } | { kind: "offline"; forMs: number } | { kind: "never" } | { kind: "revoked" };

export function screenStatus(s: Pick<Screen, "last_seen_at" | "revoked_at">, now: number): ScreenStatus {
  if (s.revoked_at) return { kind: "revoked" };
  if (isOnline(s.last_seen_at, now)) return { kind: "online" };
  const f = offlineFor(s.last_seen_at, now);
  return f === null ? { kind: "never" } : { kind: "offline", forMs: f };
}

/** Active screens first (by name), revoked ones last. */
export function sortScreens(list: Screen[]): Screen[] {
  return [...list].sort((a, b) => Number(Boolean(a.revoked_at)) - Number(Boolean(b.revoked_at)) || a.name.localeCompare(b.name, "ms"));
}