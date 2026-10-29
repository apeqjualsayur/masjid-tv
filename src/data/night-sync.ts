// Interval for the next screen_bundle call: 120 s at night, 60 s otherwise (src/core/sync-interval.ts).
// Times come from the same read order as the display (IndexedDB → bundled year file), so it works
// offline; anything missing or failing gives 60 s.
import { SYNC_DAY_MS, localDateKey, syncIntervalMs } from "@/core";
import type { PrayerData } from "./prayer-data";

export async function bundleIntervalAt(data: Pick<PrayerData, "getDay">, zone: string | null | undefined, at: number): Promise<number> {
  if (!zone) return SYNC_DAY_MS;
  try {
    const [today, yesterday] = await Promise.all([
      data.getDay(zone, localDateKey(at)),
      data.getDay(zone, localDateKey(at - 86_400_000)), // Malaysia has no DST
    ]);
    if (today.status !== "ok") return SYNC_DAY_MS;
    return syncIntervalMs(at, {
      yesterdayIsyak: yesterday.status === "ok" ? yesterday.today.times.isyak : null,
      todaySubuh: today.today.times.subuh,
      todayIsyak: today.today.times.isyak,
      tomorrowSubuh: today.tomorrowSubuh,
    });
  } catch {
    return SYNC_DAY_MS;
  }
}
