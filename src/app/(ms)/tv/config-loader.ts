// Loads screen.json; if the network is down, uses the last good copy, then the built-in defaults.
import { DEFAULT_SCREEN_CONFIG, parseScreenConfig, type ScreenConfig } from "./config";

const SAVED_KEY = "masjid-tv:screen-config";

export type ConfigSource = "network" | "sw-cache" | "saved" | "default";

export async function loadScreenConfig(
  fetchImpl: typeof fetch = fetch,
  storage: Pick<Storage, "getItem" | "setItem"> | null = safeLocalStorage(),
): Promise<{ config: ScreenConfig; warnings: string[]; source: ConfigSource }> {
  try {
    const res = await fetchImpl("/config/screen.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    try {
      storage?.setItem(SAVED_KEY, JSON.stringify(raw));
    } catch {
      // storage full or blocked
    }
    // The service worker marks copies it served from its cache while offline.
    return { ...parseScreenConfig(raw), source: res.headers.get("x-sw-cache") === "hit" ? "sw-cache" : "network" };
  } catch (e) {
    try {
      const saved = storage?.getItem(SAVED_KEY);
      if (saved) {
        const parsed = parseScreenConfig(JSON.parse(saved));
        return { ...parsed, warnings: [`screen.json unavailable (${String(e)}); using saved copy`, ...parsed.warnings], source: "saved" };
      }
    } catch {
      // fall through to defaults
    }
    return { config: DEFAULT_SCREEN_CONFIG, warnings: [`screen.json unavailable (${String(e)}); using defaults`], source: "default" };
  }
}

function safeLocalStorage() {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}