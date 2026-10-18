// Read order (PRD section 9.2): IndexedDB, then the bundled fallback, then an explicit
// "Data waktu tidak tersedia" state. Every month is validated before use; nothing is guessed.
import { nextDateKey } from "@/core";
import { monthKey, type MonthStore } from "./cache";
import { monthFromYearFile, type YearLoader } from "./fallback";
import { UNAVAILABLE_MESSAGE, type DataSource, type DayResult, type MonthData } from "./types";
import { isValidMonth } from "./validate";

export interface PrayerDataDeps {
  store: MonthStore;
  loadYear: YearLoader;
  /** Month keys fetched during this session (from startSync status), reported as "live". */
  liveKeys?: Set<string>;
}

export function createPrayerData(deps: PrayerDataDeps) {
  async function getMonth(zone: string, year: number, month: number): Promise<{ data: MonthData; source: DataSource } | null> {
    const key = monthKey(zone, year, month);
    const cached = await deps.store.get(key);
    if (cached !== undefined) {
      if (isValidMonth(cached, zone, year, month)) {
        return { data: cached, source: deps.liveKeys?.has(key) ? "live" : "cache" };
      }
      console.warn(`[masjid-tv/data] cached ${key} is corrupted; discarding it`);
      await deps.store.delete(key);
    }
    const bundled = monthFromYearFile(await deps.loadYear(zone, year), month);
    if (bundled && isValidMonth(bundled, zone, year, month)) return { data: bundled, source: "fallback" };
    return null;
  }

  /** Today's times (local date key "YYYY-MM-DD") plus tomorrow's Imsak. */
  async function getDay(zoneIn: string, dateKey: string): Promise<DayResult> {
    const zone = zoneIn.toUpperCase();
    const [y, m, d] = dateKey.split("-").map(Number);
    const month = await getMonth(zone, y, m);
    const today = month?.data.days[d - 1];
    if (!month || !today) return { status: "unavailable", message: UNAVAILABLE_MESSAGE };

    const [ty, tm, td] = nextDateKey(dateKey).split("-").map(Number);
    const tomorrowMonth = ty === y && tm === m ? month : await getMonth(zone, ty, tm);
    const tomorrowImsak = tomorrowMonth?.data.days[td - 1]?.times.imsak ?? null;

    return { status: "ok", source: month.source, today, tomorrowImsak, fetchedAt: month.data.fetchedAt };
  }

  return { getDay, getMonth };
}

export type PrayerData = ReturnType<typeof createPrayerData>;
