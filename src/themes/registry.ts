// Synchronous registry: every theme bundled. Used by the admin live preview and tests. The TV uses the
// lazy registry in ./index.ts (PRD round 2 D8) so it loads only the selected theme.
import { FALLBACK_THEME_ID, type ThemeId } from "@/core";
import { alam } from "./alam";
import { falak } from "./falak";
import { garis } from "./garis";
import { kerawang } from "./kerawang";
import { serambi } from "./serambi";
import { seterusnya } from "./seterusnya";
import { tenang } from "./tenang";
import type { ThemeDefinition } from "./types";

/** All themes (PRD section 8 + round 2). seterusnya is a placeholder until built. */
const THEMES: Partial<Record<ThemeId, ThemeDefinition>> = { alam, serambi, tenang, falak, garis, kerawang, seterusnya };

export const FALLBACK_THEME: ThemeId = FALLBACK_THEME_ID;

/** The requested theme, or the fallback (with a warning) if it is not built yet. */
export function getTheme(id: ThemeId): { theme: ThemeDefinition; warning?: string } {
  const theme = THEMES[id];
  if (theme) return { theme };
  return { theme: THEMES[FALLBACK_THEME]!, warning: `theme "${id}" is not built yet; showing "${FALLBACK_THEME}"` };
}

export function availableThemes(): ThemeId[] {
  return Object.keys(THEMES) as ThemeId[];
}
