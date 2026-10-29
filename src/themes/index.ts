"use client";
// Lazy theme registry for the TV (PRD round 2, D7 + D8): only the selected theme's code is loaded.
// Tenang is bundled (it is the fallback); every other theme is a separate chunk. While a theme loads,
// the previous one (or Tenang) stays on screen; if loading fails (offline), the old theme keeps running
// and the load is retried later. The service worker precaches every chunk and font, so a theme that
// was ever deployed loads offline too. (The admin preview still uses the synchronous ./registry.)
import { useEffect, useState } from "react";
import { FALLBACK_THEME_ID, isThemeId, type ThemeId } from "@/core";
import { tenang } from "./tenang";
import type { ThemeDefinition } from "./types";

export const THEME_RETRY_MS = 30_000;

const LOADERS: Record<ThemeId, () => Promise<ThemeDefinition>> = {
  tenang: async () => tenang,
  alam: () => import("./alam").then((m) => m.alam),
  serambi: () => import("./serambi").then((m) => m.serambi),
  falak: () => import("./falak").then((m) => m.falak),
  garis: () => import("./garis").then((m) => m.garis),
  kerawang: () => import("./kerawang").then((m) => m.kerawang),
  seterusnya: () => import("./seterusnya").then((m) => m.seterusnya),
};

const cache = new Map<ThemeId, Promise<ThemeDefinition>>();

/** Loads a theme once; a failed load is forgotten so the next call tries again. */
export function loadTheme(id: ThemeId, loaders: Record<ThemeId, () => Promise<ThemeDefinition>> = LOADERS): Promise<ThemeDefinition> {
  let p = cache.get(id);
  if (!p) {
    p = loaders[id]();
    cache.set(id, p);
    p.catch(() => cache.delete(id));
  }
  return p;
}

/** For tests. */
export function resetThemeCache(): void {
  cache.clear();
}

/** The requested id, or the fallback with a warning for an unknown value (D7). */
export function resolveThemeId(requested: string | null | undefined): { id: ThemeId; warning?: string } {
  if (isThemeId(requested)) return { id: requested };
  return { id: FALLBACK_THEME_ID, warning: `theme "${requested ?? ""}" unknown; showing "${FALLBACK_THEME_ID}"` };
}

/**
 * The theme to render now: starts with Tenang, switches once the requested theme has loaded,
 * keeps the last good theme while loading or after a failure (retried every THEME_RETRY_MS).
 */
export function useTheme(requested: string | null | undefined): { theme: ThemeDefinition; warning?: string } {
  const { id, warning: unknown } = resolveThemeId(requested);
  const [theme, setTheme] = useState<ThemeDefinition>(tenang);
  const [failedId, setFailedId] = useState<ThemeId | null>(null);
  /** Bumped by the retry timer; re-runs the load effect. */
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (theme.id === id) return;
    let off = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    loadTheme(id).then(
      (t) => {
        if (off) return;
        setTheme(t);
        setFailedId(null);
      },
      () => {
        if (off) return;
        setFailedId(id);
        retry = setTimeout(() => setAttempt((a) => a + 1), THEME_RETRY_MS);
      },
    );
    return () => {
      off = true;
      clearTimeout(retry);
    };
  }, [id, theme.id, attempt]);

  const loadWarning = failedId === id && theme.id !== id ? `theme "${id}" could not be loaded; showing "${theme.id}" (retrying)` : undefined;
  return { theme, warning: unknown ?? loadWarning };
}
