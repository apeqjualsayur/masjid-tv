// Hero TV data (PRD §4 row 2): Masjid Al-Hidayah in zone WLY01 (Kuala Lumpur), the bundled year
// file, the Phase 1 engine. Pure functions (no React, no network) so they can be tested.
import { buildDisplayState, DEFAULT_DURATIONS, formatGregorian, localDateKey, localParts, localToEpoch, parseLocalDateTime, type DisplayState } from "@/core";
import { createPrayerData, type DayResult, type MonthStore, type YearFile } from "@/data";
import type { SlideView } from "@/themes/types";

export const HERO_ZONE = "WLY01";
export const HERO_MASJID = { fullName: "Masjid Al-Hidayah", shortName: "Al-Hidayah" };
const HERO_IQAMAH = { subuh: 10, zohor: 10, asar: 10, maghrib: 7, isyak: 10 };

/** The demo slide: one Kuliah (TV text is always BM). The date line is the day being shown. */
export function heroSlide(at: number): SlideView {
  return {
    kind: "template",
    template: "kuliah",
    fields: {
      series: "Kuliah Maghrib",
      topic: "Adab Menuntut Ilmu",
      speaker: "Penceramah jemputan",
      date: formatGregorian(at).replace(/ \d{4}$/, ""),
      time: "Selepas solat Maghrib",
      venue: "Dewan solat utama",
    },
  } as SlideView;
}

/** ?sim=2026-10-23T13:20 (Malaysia time) on the landing page, for testing; anything else → null. */
export function simFromSearch(search: string): number | null {
  const v = new URLSearchParams(search).get("sim");
  return v ? parseLocalDateTime(v) : null;
}

/**
 * The moment to show. Inside the data's year: unchanged. Outside it (e.g. 2027 before that year's
 * file is bundled): the same date and time of day in the data's year, so the hero still follows the
 * real time of day instead of going blank.
 */
export function heroTime(at: number, dataYear: number): number {
  const p = localParts(at);
  if (p.year === dataYear) return at;
  const lastDay = new Date(Date.UTC(dataYear, p.month, 0)).getUTCDate(); // 29 Feb → 28 Feb
  return localToEpoch(dataYear, p.month, Math.min(p.day, lastDay), p.hour, p.minute, p.second);
}

const noCache: MonthStore = { get: async () => undefined, put: async () => undefined, delete: async () => undefined };

/** One day's times from the bundled file, through the same reader and checks the TV uses. */
export async function heroDay(file: YearFile, dateKey: string): Promise<DayResult> {
  const data = createPrayerData({ store: noCache, loadYear: async (zone, year) => (zone === file.zone && year === file.year ? file : null) });
  return data.getDay(file.zone, dateKey);
}

export const heroDateKey = (at: number, dataYear: number) => localDateKey(heroTime(at, dataYear));

/** The DisplayState for the hero at `at` (already mapped with heroTime), or null without data. */
export function heroState(day: DayResult, at: number, lite: boolean): DisplayState | null {
  if (day.status !== "ok") return null;
  return buildDisplayState({
    at,
    today: day.today,
    tomorrowImsak: day.tomorrowImsak,
    tomorrowSubuh: day.tomorrowSubuh,
    clock24h: false,
    showArabic: true,
    ticker: [],
    lite,
    masjid: HERO_MASJID,
    modeConfig: { durations: DEFAULT_DURATIONS, iqamahMin: HERO_IQAMAH },
  });
}