// Skrin rules (PRD Phase 2 §4.4, designs/admin/Screens; round 2 §6). Pure: no React, no Supabase.
import type { LayoutKey, ThemeId } from "@/core";
import { isOnline, offlineFor } from "../home/logic";

/** Launch themes and layouts, then the round-2 additions (shown when THEMES_ROUND2_VISIBLE). */
export const THEMES = ["alam", "serambi", "tenang"] as const satisfies readonly ThemeId[];
export const ROUND2_THEMES = ["falak", "garis", "kerawang", "seterusnya"] as const satisfies readonly ThemeId[];
export const LAYOUTS = ["full", "bottom", "side"] as const satisfies readonly LayoutKey[];
export const ROUND2_LAYOUTS = ["poster"] as const satisfies readonly LayoutKey[];
export type Theme = ThemeId;
export type Layout = LayoutKey;
export const NAME_MAX = 60;

/**
 * Choices to offer. With round 2 hidden, a screen that already uses a round-2 value still shows it
 * (so editing its name never silently changes its theme or layout).
 */
export function themeChoices(round2: boolean, current?: Theme): Theme[] {
  if (round2) return [...THEMES, ...ROUND2_THEMES];
  return current && !(THEMES as readonly Theme[]).includes(current) ? [...THEMES, current] : [...THEMES];
}
export function layoutChoices(round2: boolean, current?: Layout): Layout[] {
  if (round2) return [...LAYOUTS, ...ROUND2_LAYOUTS];
  return current && !(LAYOUTS as readonly Layout[]).includes(current) ? [...LAYOUTS, current] : [...LAYOUTS];
}

/** localStorage key: the owner dismissed the "Pengumuman sahaja for the second TV" suggestion. */
export const POSTER_TIP_KEY = "mv:poster-tip-dismissed";

/** Suggest the poster layout in "Tambah skrin" when the masjid has exactly one (active) screen. */
export function suggestPosterLayout(screens: Pick<Screen, "revoked_at">[] | null, dismissed: boolean, round2: boolean): boolean {
  return round2 && !dismissed && (screens ?? []).filter((s) => !s.revoked_at).length === 1;
}

export interface Screen {
  id: string;
  name: string;
  theme: Theme;
  layout: Layout;
  last_seen_at: string | null;
  revoked_at: string | null;
  app_version: string | null;
  /** How the TV is shown (migration 0010): app = kiosk/installed, tab = full screen by key press, window = not full screen */
  view_mode?: "app" | "tab" | "window" | null;
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