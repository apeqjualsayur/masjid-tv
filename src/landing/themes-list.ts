// Themes the landing page shows (Numbers band, Cuba sekarang, Tema). Follows the admin's feature
// switch, so the public page never offers a theme an owner cannot pick yet (PRD round 2 §6, T10).
import type { ThemeId } from "@/core";
import { THEMES_ROUND2_VISIBLE } from "@/config/features";

export const LAUNCH_THEMES = ["tenang", "serambi", "alam"] as const satisfies readonly ThemeId[];
export const ROUND2_THEMES = ["falak", "garis", "kerawang", "seterusnya"] as const satisfies readonly ThemeId[];

export function landingThemes(round2 = THEMES_ROUND2_VISIBLE): ThemeId[] {
  return round2 ? [...LAUNCH_THEMES, ...ROUND2_THEMES] : [...LAUNCH_THEMES];
}

/** The "Dua TV, dua tugas" card (announcement-only screen) appears with round 2. */
export const showDualScreens = (round2 = THEMES_ROUND2_VISIBLE) => round2;
