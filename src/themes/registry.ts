import type { ThemeId } from "@/core";
import { alam } from "./alam";
import { serambi } from "./serambi";
import { tenang } from "./tenang";
import type { ThemeDefinition } from "./types";

/** All launch themes (PRD section 8). */
const THEMES: Partial<Record<ThemeId, ThemeDefinition>> = { alam, serambi, tenang };

export const FALLBACK_THEME: ThemeId = "tenang";

/** The requested theme, or the fallback (with a warning) if it is not built yet. */
export function getTheme(id: ThemeId): { theme: ThemeDefinition; warning?: string } {
  const theme = THEMES[id];
  if (theme) return { theme };
  return { theme: THEMES[FALLBACK_THEME]!, warning: `theme "${id}" is not built yet; showing "${FALLBACK_THEME}"` };
}

export function availableThemes(): ThemeId[] {
  return Object.keys(THEMES) as ThemeId[];
}