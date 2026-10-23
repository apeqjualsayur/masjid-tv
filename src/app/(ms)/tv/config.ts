// Screen config (public/config/screen.json, PRD section 9.4) and URL overrides (PRD section 10).
import { parseLocalDateTime, type IqamahMinutes, type LayoutKey, type ModeDurations, type ModeKey, type ThemeId } from "@/core";
import { findZone } from "@/data";
import { TEMPLATE_KEYS, type TemplateKey } from "@/templates";

export interface ScreenConfig {
  masjid: { fullName: string; shortName: string; logo?: string };
  zone: string;
  theme: ThemeId;
  layout: LayoutKey;
  clock24h: boolean;
  showArabic: boolean;
  durations: ModeDurations;
  iqamahMin: IqamahMinutes;
  ticker: string[];
}

/** Used for any field that is missing or invalid in screen.json. Same values as the shipped file. */
export const DEFAULT_SCREEN_CONFIG: ScreenConfig = {
  masjid: { fullName: "Nama Masjid / Surau", shortName: "NM", logo: "/config/logo.png" },
  zone: "SGR01",
  theme: "alam",
  layout: "full",
  clock24h: false,
  showArabic: true,
  durations: { preAzanMin: 5, azanMin: 3, solatMin: 12, khutbahMin: 40, jumaatSolatMin: 12, showFridayInfo: true },
  iqamahMin: { subuh: 10, zohor: 10, asar: 10, maghrib: 7, isyak: 10 },
  ticker: ["[Teks pengumuman]"],
};

export const THEMES: readonly ThemeId[] = ["alam", "serambi", "tenang"];
export const LAYOUTS: readonly LayoutKey[] = ["full", "bottom", "side"];
const MODES: readonly ModeKey[] = ["normal", "pre_azan", "azan", "iqamah", "solat", "khutbah"];

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T => typeof v === "string" && (list as readonly string[]).includes(v);

/** Validate screen.json field by field; bad fields fall back to defaults with a warning. */
export function parseScreenConfig(raw: unknown): { config: ScreenConfig; warnings: string[] } {
  const warnings: string[] = [];
  const d = DEFAULT_SCREEN_CONFIG;
  const r = isObj(raw) ? raw : (warnings.push("screen.json is not an object; using defaults"), {});

  const str = (v: unknown, def: string, name: string) => {
    if (typeof v === "string" && v.trim()) return v.trim();
    if (v !== undefined) warnings.push(`${name} invalid; using "${def}"`);
    return def;
  };
  const bool = (v: unknown, def: boolean, name: string) => {
    if (typeof v === "boolean") return v;
    if (v !== undefined) warnings.push(`${name} invalid; using ${def}`);
    return def;
  };
  const minutes = (v: unknown, def: number, name: string) => {
    if (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 180) return v;
    if (v !== undefined) warnings.push(`${name} invalid; using ${def}`);
    return def;
  };

  const m = isObj(r.masjid) ? r.masjid : {};
  const dur = isObj(r.durations) ? r.durations : {};
  const iq = isObj(r.iqamahMin) ? r.iqamahMin : {};

  const zone = str(r.zone, d.zone, "zone").toUpperCase();
  if (!findZone(zone)) warnings.push(`zone ${zone} is not in the JAKIM zone list`);

  let theme = d.theme;
  if (oneOf(THEMES, r.theme)) theme = r.theme;
  else if (r.theme !== undefined) warnings.push(`theme invalid; using "${d.theme}"`);
  let layout = d.layout;
  if (oneOf(LAYOUTS, r.layout)) layout = r.layout;
  else if (r.layout !== undefined) warnings.push(`layout invalid; using "${d.layout}"`);

  let ticker = d.ticker;
  if (Array.isArray(r.ticker) && r.ticker.every((t) => typeof t === "string")) ticker = r.ticker.filter((t) => t.trim());
  else if (r.ticker !== undefined) warnings.push("ticker invalid; using default");

  // Missing logo field: default path. Empty string: no logo.
  const logo = typeof m.logo === "string" ? m.logo.trim() || undefined : d.masjid.logo;

  return {
    warnings,
    config: {
      masjid: {
        fullName: str(m.fullName, d.masjid.fullName, "masjid.fullName"),
        shortName: str(m.shortName, d.masjid.shortName, "masjid.shortName"),
        logo,
      },
      zone,
      theme,
      layout,
      clock24h: bool(r.clock24h, d.clock24h, "clock24h"),
      showArabic: bool(r.showArabic, d.showArabic, "showArabic"),
      durations: {
        preAzanMin: minutes(dur.preAzanMin, d.durations.preAzanMin, "durations.preAzanMin"),
        azanMin: minutes(dur.azanMin, d.durations.azanMin, "durations.azanMin"),
        solatMin: minutes(dur.solatMin, d.durations.solatMin, "durations.solatMin"),
        khutbahMin: minutes(dur.khutbahMin, d.durations.khutbahMin, "durations.khutbahMin"),
        // Added for Friday (PRD §5.1): older screen.json files / bundles without them get the defaults.
        jumaatSolatMin: minutes(dur.jumaatSolatMin, d.durations.jumaatSolatMin, "durations.jumaatSolatMin"),
        showFridayInfo: bool(dur.showFridayInfo, d.durations.showFridayInfo, "durations.showFridayInfo"),
      },
      iqamahMin: {
        subuh: minutes(iq.subuh, d.iqamahMin.subuh, "iqamahMin.subuh"),
        zohor: minutes(iq.zohor, d.iqamahMin.zohor, "iqamahMin.zohor"),
        asar: minutes(iq.asar, d.iqamahMin.asar, "iqamahMin.asar"),
        maghrib: minutes(iq.maghrib, d.iqamahMin.maghrib, "iqamahMin.maghrib"),
        isyak: minutes(iq.isyak, d.iqamahMin.isyak, "iqamahMin.isyak"),
      },
      ticker,
    },
  };
}

export interface UrlOverrides {
  /** ?debug=1: show the debug overlay. */
  debug: boolean;
  /** ?debug=state: show the plain DisplayState view instead of the theme. */
  debugState: boolean;
  /** Debug params are honoured only with ?debug=1 or on localhost (PRD section 10). */
  debugAllowed: boolean;
  theme?: ThemeId;
  layout?: LayoutKey;
  mode?: ModeKey;
  simStartMs?: number;
  speed?: number;
  forceFriday: boolean;
  /** ?slide=kuliah | poster: preview one template or the sample poster (until the playlist exists). */
  slide?: TemplateKey | "poster" | "poster-landscape";
  /** ?lite=1 forces lite on, ?lite=0 forces it off (no auto-detect). Always honoured. */
  lite?: boolean;
}

const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]", "::1"];

export function parseUrlOverrides(search: string, hostname: string): { overrides: UrlOverrides; warnings: string[] } {
  const q = new URLSearchParams(search);
  const warnings: string[] = [];
  const debugState = q.get("debug") === "state";
  const debug = q.get("debug") === "1" || debugState;
  // The live demo (?demo=1, PRD §6) takes theme/layout/sim/speed… without ?debug=1, so the landing
  // page can link to variants. It shows only demo content, never a masjid's.
  const demo = q.get("demo") === "1";
  const debugAllowed = debug || demo || LOCAL_HOSTS.includes(hostname);
  const o: UrlOverrides = { debug, debugState, debugAllowed, forceFriday: false };

  const lite = q.get("lite");
  if (lite === "1" || lite === "true") o.lite = true;
  else if (lite === "0" || lite === "false") o.lite = false;

  const debugKeys = ["theme", "layout", "mode", "sim", "speed", "day", "slide"].filter((k) => q.has(k));
  if (!debugAllowed) {
    if (debugKeys.length) warnings.push(`ignored ${debugKeys.join(", ")} (add ?debug=1)`);
    return { overrides: o, warnings };
  }

  const theme = q.get("theme");
  if (theme !== null) oneOf(THEMES, theme) ? (o.theme = theme) : warnings.push(`theme=${theme} unknown`);
  const layout = q.get("layout");
  if (layout !== null) oneOf(LAYOUTS, layout) ? (o.layout = layout) : warnings.push(`layout=${layout} unknown`);
  const mode = q.get("mode");
  if (mode !== null) oneOf(MODES, mode) ? (o.mode = mode) : warnings.push(`mode=${mode} unknown`);

  const sim = q.get("sim");
  if (sim !== null) {
    const ms = parseLocalDateTime(sim);
    if (ms === null) warnings.push(`sim=${sim} invalid (use 2026-10-17T13:04:30)`);
    else o.simStartMs = ms;
  }
  const speed = q.get("speed");
  if (speed !== null) {
    const n = Number(speed);
    if (Number.isFinite(n) && n > 0 && n <= 3600) o.speed = n;
    else warnings.push(`speed=${speed} invalid`);
  }
  const day = q.get("day");
  if (day !== null) day.toLowerCase() === "fri" ? (o.forceFriday = true) : warnings.push(`day=${day} unknown (only fri)`);
  const slide = q.get("slide");
  if (slide !== null) slide === "poster" || slide === "poster-landscape" || oneOf(TEMPLATE_KEYS, slide) ? (o.slide = slide) : warnings.push(`slide=${slide} unknown`);

  return { overrides: o, warnings };
}
/**
 * Phase 2 (PRD §4.4): a TV pairs with a masjid and gets its content from Supabase.
 * Local mode = Phase 1 behaviour from public/config/screen.json: `?local=1` (development,
 * emergencies), or a build without Supabase settings.
 */
export function isLocalMode(search: string, configured: boolean): boolean {
  return !configured || new URLSearchParams(search).get("local") === "1";
}
