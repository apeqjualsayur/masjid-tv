import { describe, expect, it } from "vitest";
import { dayTimes } from "./__fixtures__/sgr01-2026-10";
import { SYNC_DAY_MS, SYNC_NIGHT_MARGIN_MS, SYNC_NIGHT_MS, syncIntervalMs, type NightTimes } from "./sync-interval";

const MIN = 60_000;
type Day = 15 | 16 | 17 | 18;
/** SGR01 times around day d of October 2026 (fixture has 15–18). */
const around = (d: 16 | 17): NightTimes => ({
  yesterdayIsyak: dayTimes((d - 1) as Day).times.isyak,
  todaySubuh: dayTimes(d).times.subuh,
  todayIsyak: dayTimes(d).times.isyak,
  tomorrowSubuh: dayTimes((d + 1) as Day).times.subuh,
});

describe("TV sync interval (60 s by day, 120 s at night)", () => {
  const fri = around(16); // Friday 16 Oct 2026: Subuh 5:50, Isyak 8:11 pm
  const sat = around(17);
  const isyak = fri.todayIsyak!;
  const subuh = fri.todaySubuh!;

  it("60 s during the day and until Isyak + 30 min", () => {
    expect(syncIntervalMs(subuh, fri)).toBe(SYNC_DAY_MS);
    expect(syncIntervalMs(isyak, fri)).toBe(SYNC_DAY_MS);
    expect(syncIntervalMs(isyak + 29 * MIN, fri)).toBe(SYNC_DAY_MS);
  });

  it("120 s from exactly Isyak + 30 min", () => {
    expect(syncIntervalMs(isyak + SYNC_NIGHT_MARGIN_MS, fri)).toBe(SYNC_NIGHT_MS);
    expect(syncIntervalMs(isyak + 2 * 60 * MIN, fri)).toBe(SYNC_NIGHT_MS);
  });

  it("Friday: Zohor (Jumaat) is daytime 60 s; Friday night is a normal night", () => {
    expect(syncIntervalMs(dayTimes(16).times.zohor, fri)).toBe(SYNC_DAY_MS);
    expect(syncIntervalMs(isyak + 45 * MIN, fri)).toBe(SYNC_NIGHT_MS);
  });

  it("around midnight: 120 s on both sides of 00:00", () => {
    const midnight = Date.parse("2026-10-17T00:00:00+08:00");
    expect(syncIntervalMs(midnight - MIN, fri)).toBe(SYNC_NIGHT_MS); // Fri 23:59, tonight's window
    expect(syncIntervalMs(midnight + MIN, sat)).toBe(SYNC_NIGHT_MS); // Sat 00:01, last night's window
  });

  it("back to 60 s from Subuh − 30 min", () => {
    const satSubuh = sat.todaySubuh!;
    expect(syncIntervalMs(satSubuh - SYNC_NIGHT_MARGIN_MS - 1, sat)).toBe(SYNC_NIGHT_MS); // 5:19:59
    expect(syncIntervalMs(satSubuh - SYNC_NIGHT_MARGIN_MS, sat)).toBe(SYNC_DAY_MS); // 5:20
    expect(syncIntervalMs(satSubuh, sat)).toBe(SYNC_DAY_MS);
  });

  it("missing times fall back to 60 s", () => {
    const late = isyak + 2 * 60 * MIN;
    expect(syncIntervalMs(late, null)).toBe(SYNC_DAY_MS);
    expect(syncIntervalMs(late, undefined)).toBe(SYNC_DAY_MS);
    expect(syncIntervalMs(late, { ...fri, tomorrowSubuh: null })).toBe(SYNC_DAY_MS); // end of the data
    const early = subuh - 60 * MIN; // 4:50 am
    expect(syncIntervalMs(early, fri)).toBe(SYNC_NIGHT_MS);
    expect(syncIntervalMs(early, { ...fri, yesterdayIsyak: null })).toBe(SYNC_DAY_MS);
  });

  it("never 120 s when the window would be empty or backwards", () => {
    const odd: NightTimes = { yesterdayIsyak: null, todaySubuh: null, todayIsyak: isyak, tomorrowSubuh: isyak + 50 * MIN };
    expect(syncIntervalMs(isyak + 40 * MIN, odd)).toBe(SYNC_DAY_MS);
  });
});
