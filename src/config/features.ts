// Feature switches for the admin app. Read at build time (static export), so a value only changes
// with a new build.

/**
 * Themes round 2 (PRD round 2 §6): shows Falak, Garis Masa, Kerawang, Seterusnya and the
 * "Pengumuman sahaja" (poster) layout in the admin and on the landing page. Switched on for
 * production on 2026-10-30 (rollout step 5). Rollback: set back to
 * `process.env.NEXT_PUBLIC_THEMES_ROUND2 === "1"` (off unless .env.local sets it). TVs are not
 * affected: they render any theme they get.
 */
export const THEMES_ROUND2_VISIBLE: boolean = true;
