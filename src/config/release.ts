// The current rollout, for the admin's update notice and the TV's "new version" hint.
// Bump RELEASE when a change needs every TV on new code: set `minTvBuild` to a time (Malaysia,
// "YYYY-MM-DD HH:MM") at or before the deploy that brings it, give it a new `id` (so a dismissed
// notice shows again), and update `update.whatsNew` in the admin i18n files.

export const RELEASE = {
  id: "2026-10-30-fullscreen",
  /** TVs built before this need an update. */
  minTvBuild: "2026-10-30 16:00",
} as const;

/** "0.1.0 (2026-10-30 14:15)" → "2026-10-30 14:15"; null when the string has no build time. */
export function buildTimeOf(appVersion: string | null | undefined): string | null {
  return /\((\d{4}-\d{2}-\d{2} \d{2}:\d{2})\)/.exec(appVersion ?? "")?.[1] ?? null;
}

/**
 * A TV (or the admin page) built before `minBuild`. A local dev build ("dev") is never outdated;
 * no version at all (TVs from before version reporting) is.
 */
export function isOutdated(appVersion: string | null | undefined, minBuild: string): boolean {
  if (appVersion === "dev") return false;
  const b = buildTimeOf(appVersion);
  return b === null || b < minBuild;
}

/** public/version.json (written at build time by next.config.ts, never cached by the service worker). */
export interface LiveVersion {
  version: string;
  builtAt: string;
  minTvBuild: string;
}
export const VERSION_URL = "/version.json";

export function parseLiveVersion(raw: unknown): LiveVersion | null {
  const v = raw as Partial<LiveVersion> | null;
  return v && typeof v.version === "string" && typeof v.builtAt === "string" && typeof v.minTvBuild === "string" ? { version: v.version, builtAt: v.builtAt, minTvBuild: v.minTvBuild } : null;
}
