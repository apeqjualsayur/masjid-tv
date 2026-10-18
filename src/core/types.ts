// Shared engine types. Mirrors _specs/01-theme-contract.md §1 (the engine side of it).

export type WaktuKey = "imsak" | "subuh" | "syuruk" | "zohor" | "asar" | "maghrib" | "isyak";
/** The five actual prayers. Imsak and Syuruk are markers only (PRD §4). */
export type PrayerKey = "subuh" | "zohor" | "asar" | "maghrib" | "isyak";
export type PhaseKey = "subuh" | "zohor" | "asar" | "maghrib" | "isyak";
export type LayoutKey = "full" | "bottom" | "side";
export type ThemeId = "alam" | "serambi" | "tenang";
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
