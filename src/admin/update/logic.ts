// Update notice at the top of the admin (owner request 2026-10-30): shown only when this masjid is
// behind: a TV still on a build older than the release's minimum, or this admin page older than the
// live site. Pure: no React, no Supabase.
import { buildTimeOf, isOutdated, type LiveVersion } from "@/config/release";

export type ViewMode = "app" | "tab" | "window";

export interface ScreenVersionRow {
  id: string;
  name: string;
  app_version: string | null;
  /** null until the TV runs the code that reports it (migration 0010) */
  view_mode?: ViewMode | null;
  last_seen_at: string | null;
  revoked_at: string | null;
}

/** A TV that has not synced for a week is switched off: it updates when it comes back, so no nagging. */
export const RECENT_MS = 7 * 86_400_000;

export function outdatedScreens(rows: ScreenVersionRow[], minTvBuild: string, now: number): ScreenVersionRow[] {
  return rows.filter((s) => !s.revoked_at && s.last_seen_at !== null && now - Date.parse(s.last_seen_at) <= RECENT_MS && isOutdated(s.app_version, minTvBuild));
}

/** This admin page was built before the live site (a newer version is deployed). Dev builds never are. */
export function adminOutdated(adminVersion: string, live: LiveVersion | null): boolean {
  if (!live || adminVersion === "dev") return false;
  const own = buildTimeOf(adminVersion);
  return own !== null && own < live.builtAt;
}

/** How to update one TV, by how it is shown (i18n key). */
export const howKey = (mode: ViewMode | null | undefined) => (mode === "tab" ? "update.how.tab" : mode === "app" ? "update.how.app" : "update.how.window");

export interface Notice {
  admin: boolean;
  screens: ScreenVersionRow[];
  /** What the owner dismissed: a new outdated TV, or a newer admin version, shows the notice again. */
  key: string;
}

export function updateNotice(p: { releaseId: string; minTvBuild: string; adminVersion: string; live: LiveVersion | null; rows: ScreenVersionRow[]; now: number }): Notice | null {
  const min = p.live?.minTvBuild ?? p.minTvBuild;
  const screens = outdatedScreens(p.rows, min, p.now);
  const admin = adminOutdated(p.adminVersion, p.live);
  if (!admin && screens.length === 0) return null;
  const key = [p.releaseId, min, admin ? p.live?.builtAt : "", ...screens.map((s) => s.id).sort()].join("|");
  return { admin, screens, key };
}

export const DISMISS_KEY = "mv:update-dismissed";
