// Utama (home) data rules. Pure: no React, no Supabase.
import { isEligible, type LayoutKey, type PlaylistItem, type ThemeId } from "@/core";

export const ONLINE_WINDOW_MS = 3 * 60_000;

export interface ScreenRow {
  id: string;
  name: string;
  theme: ThemeId;
  layout: LayoutKey;
  last_seen_at: string | null;
  revoked_at: string | null;
}

export interface SlideRow {
  id: string;
  type: "poster" | "template";
  template_key: string | null;
  fields: Record<string, unknown>;
  status: "draft" | "published" | "paused";
  starts_at: string;
  ends_at: string | null;
  duration_s: number;
  days_of_week: number[] | null;
  priority: boolean;
  sort_order: number;
  screen_ids: string[] | null;
}

/** Online = seen by screen_bundle within the last 3 minutes (PRD §7). */
export function isOnline(lastSeenAt: string | null, now: number): boolean {
  if (!lastSeenAt) return false;
  const t = Date.parse(lastSeenAt);
  return Number.isFinite(t) && now - t <= ONLINE_WINDOW_MS;
}

/** How long a screen has been offline (ms), or null if it was never seen. */
export function offlineFor(lastSeenAt: string | null, now: number): number | null {
  if (!lastSeenAt) return null;
  const t = Date.parse(lastSeenAt);
  return Number.isFinite(t) ? Math.max(0, now - t) : null;
}

/** Database weekdays → playlist weekdays (shared with the TV bundle sync). */
export { dbDaysToPlaylist } from "@/data/bundle";
import { dbDaysToPlaylist } from "@/data/bundle";

export function toPlaylistItem(s: SlideRow): PlaylistItem<SlideRow> {
  return {
    id: s.id,
    durationS: s.duration_s,
    startsAt: s.starts_at,
    endsAt: s.ends_at ?? undefined,
    daysOfWeek: dbDaysToPlaylist(s.days_of_week),
    priority: s.priority,
    sortOrder: s.sort_order,
    status: s.status === "published" ? "active" : "draft",
    payload: s,
  };
}

/** "Sedang dipapar": published slides that the TV would show at `now`, in playlist order. */
export function liveSlides(rows: SlideRow[], now: number): SlideRow[] {
  return rows
    .filter((r) => r.status === "published" && isEligible(toPlaylistItem(r), now))
    .sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));
}

/** Whole days / hours / minutes for "Luar talian 3 jam", "dalam 2 jam 51 minit". */
export function durationParts(ms: number): { d: number; h: number; m: number } {
  const totalMin = Math.max(0, Math.ceil(ms / 60_000));
  return { d: Math.floor(totalMin / 1440), h: Math.floor((totalMin % 1440) / 60), m: totalMin % 60 };
}

/** Number of target screens, or "all" when screen_ids is null. Revoked screens are not counted. */
export function targetCount(slide: Pick<SlideRow, "screen_ids">, screens: Pick<ScreenRow, "id">[]): "all" | number {
  if (!slide.screen_ids) return "all";
  return slide.screen_ids.filter((id) => screens.some((s) => s.id === id)).length;
}