"use client";
// Today's prayer times for the masjid's zone, through the Phase 1 data layer (IndexedDB → bundled
// file → API). Never guessed: when nothing is available the card says so.
import { useEffect, useState } from "react";
import { computeSchedule, localDateKey, type ScheduleState } from "@/core";
import { createFallbackLoader, createPrayerData, idbMonthStore, refreshMonths, type DayResult } from "@/data";

export function usePrayerToday(zone: string | null, now: number): { schedule: ScheduleState | null; hijri: string | null; loading: boolean; day: DayResult | null } {
  const dateKey = localDateKey(now);
  const [day, setDay] = useState<DayResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!zone) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const store = idbMonthStore();
      const data = createPrayerData({ store, loadYear: createFallbackLoader() });
      let r = await data.getDay(zone, dateKey);
      if (r.status !== "ok" || r.tomorrowSubuh === null) {
        await refreshMonths(zone, Date.now(), store).catch(() => undefined);
        r = await data.getDay(zone, dateKey);
      }
      if (!cancelled) {
        setDay(r);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [zone, dateKey]);

  if (!day || day.status !== "ok") return { schedule: null, hijri: null, loading, day: null };
  const schedule = computeSchedule({ today: day.today, tomorrowImsak: day.tomorrowImsak ?? NaN, tomorrowSubuh: day.tomorrowSubuh ?? NaN }, now);
  return { schedule, hijri: day.today.hijri, loading, day };
}