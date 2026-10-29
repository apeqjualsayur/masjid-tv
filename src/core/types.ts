// Shared engine types. Mirrors _specs/01-theme-contract.md §1 (the engine side of it).

export type WaktuKey = "imsak" | "subuh" | "syuruk" | "zohor" | "asar" | "maghrib" | "isyak";
/** The five actual prayers. Imsak and Syuruk are markers only (PRD §4). */
export type PrayerKey = "subuh" | "zohor" | "asar" | "maghrib" | "isyak";
export type PhaseKey = "subuh" | "zohor" | "asar" | "maghrib" | "isyak";
/** `poster` = announcement-only screen (PRD round 2 §4): slides only, prayer modes never take over. */
export type LayoutKey = "full" | "bottom" | "side" | "poster";
export type ThemeId = "alam" | "serambi" | "tenang" | "falak" | "garis" | "kerawang" | "seterusnya";
/** Every valid id, in admin order. Anything else from a bundle or URL falls back (PRD round 2 D7). */
export const THEME_IDS: readonly ThemeId[] = ["alam", "serambi", "tenang", "falak", "garis", "kerawang", "seterusnya"];
export const LAYOUT_KEYS: readonly LayoutKey[] = ["full", "bottom", "side", "poster"];
export const FALLBACK_THEME_ID: ThemeId = "tenang";
export const FALLBACK_LAYOUT: LayoutKey = "full";
export const isThemeId = (v: unknown): v is ThemeId => typeof v === "string" && (THEME_IDS as readonly string[]).includes(v);
export const isLayoutKey = (v: unknown): v is LayoutKey => typeof v === "string" && (LAYOUT_KEYS as readonly string[]).includes(v);
export type ModeKey = "normal" | "pre_azan" | "azan" | "iqamah" | "solat" | "khutbah";
export type WaktuState = "past" | "current" | "next" | "upcoming";

/** One local (Malaysia) day of prayer times, as epoch milliseconds. */
export interface DayTimes {
  /** Local date "YYYY-MM-DD". */
  date: string;
  /** Hijri date from the API, "1448-05-06". */
  hijri: string;
  times: Record<WaktuKey, number>;
}
