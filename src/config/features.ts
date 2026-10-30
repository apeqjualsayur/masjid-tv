// Feature switches for the admin app. Read at build time (static export), so a value only changes
// with a new build.

/**
 * Themes round 2 (PRD round 2 §6): shows Falak, Garis Masa, Kerawang, Seterusnya and the
 * "Pengumuman sahaja" (poster) layout in the admin. Default false, so production keeps the three
 * launch themes until the owner switches it on. A dev build turns it on with
 * NEXT_PUBLIC_THEMES_ROUND2=1 in .env.local. TVs are not affected: they render any theme they get.
 */
export const THEMES_ROUND2_VISIBLE: boolean = process.env.NEXT_PUBLIC_THEMES_ROUND2 === "1";
