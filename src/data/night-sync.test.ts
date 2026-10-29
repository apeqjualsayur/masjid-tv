import { describe, expect, it } from "vitest";
import { dayTimes } from "@/core/__fixtures__/sgr01-2026-10";
import { SYNC_DAY_MS, SYNC_NIGHT_MS } from "@/core";
import { startBundleSync, type BundleStore } from "./bundle";
import { bundleIntervalAt } from "./night-sync";
import type { DayResult } from "./types";

const at = (s: string) => Date.parse(`${s}+08:00`);
const DAYS = [15, 16, 17, 18] as const;

/** getDay over the SGR01 fixture (15–18 Oct 2026); other dates are unavailable, as with missing data. */
function fakeData(opts: { throws?: boolean } = {}) {
  const calls: string[] = [];
  return {
    calls,
    getDay: async (zone: string, dateKey: string): Promise<DayResult> => {
      calls.push(`${zone} ${dateKey}`);
      if (opts.throws) throw new Error("idb broken");
      const d = DAYS.find((n) => dayTimes(n).date === dateKey);
      if (!d) return { status: "unavailable", message: "Data waktu tidak tersedia" };
      const next = DAYS.find((n) => n === d + 1);
      return {
        status: "ok", source: "cache", today: dayTimes(d), fetchedAt: 0,
        tomorrowImsak: next ? dayTimes(next).times.imsak : null, tomorrowSubuh: next ? dayTimes(next).times.subuh : null,
      };
    },
  };
}

describe("bundleIntervalAt (prayer times for the masjid's zone)", () => {
  it("120 s at night, 60 s by day, for the masjid's zone", async () => {
    const data = fakeData();
    expect(await bundleIntervalAt(data, "SGR01", at("2026-10-16T23:00:00"))).toBe(SYNC_NIGHT_MS);
    expect(await bundleIntervalAt(data, "SGR01", at("2026-10-17T02:00:00"))).toBe(SYNC_NIGHT_MS); // after midnight
    expect(await bundleIntervalAt(data, "SGR01", at("2026-10-17T13:00:00"))).toBe(SYNC_DAY_MS);
    expect(await bundleIntervalAt(data, "SGR01", at("2026-10-16T13:02:00"))).toBe(SYNC_DAY_MS); // Friday Jumaat
    expect(data.calls).toContain("SGR01 2026-10-16");
  });

  it("missing times, no zone or a broken store → 60 s", async () => {
    expect(await bundleIntervalAt(fakeData(), "SGR01", at("2026-10-20T23:00:00"))).toBe(SYNC_DAY_MS); // no data for that day
    expect(await bundleIntervalAt(fakeData(), "SGR01", at("2026-10-18T23:00:00"))).toBe(SYNC_DAY_MS); // tomorrow unknown
    expect(await bundleIntervalAt(fakeData(), "SGR01", at("2026-10-15T02:00:00"))).toBe(SYNC_DAY_MS); // yesterday unknown
    expect(await bundleIntervalAt(fakeData(), null, at("2026-10-16T23:00:00"))).toBe(SYNC_DAY_MS);
    expect(await bundleIntervalAt(fakeData({ throws: true }), "SGR01", at("2026-10-16T23:00:00"))).toBe(SYNC_DAY_MS);
  });
});

describe("startBundleSync with a changing interval", () => {
  const store: BundleStore = { get: async () => null, put: async () => {}, clear: async () => {} };
  const unchanged = async () => ({ data: { status: "unchanged", version: 1 }, error: null });

  it("asks before every wait and reports it in the state", async () => {
    const waits: number[] = [];
    const timers: (() => void)[] = [];
    let night = false;
    const states: (number | undefined)[] = [];
    const sync = startBundleSync({
      call: unchanged, store, onState: (s) => states.push(s.intervalMs),
      intervalMs: () => (night ? SYNC_NIGHT_MS : SYNC_DAY_MS),
      setTimer: (fn, ms) => (waits.push(ms), timers.push(fn)),
      clearTimer: () => {},
    });
    await sync.ready;
    night = true;
    timers.shift()!();
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    expect(waits).toEqual([SYNC_DAY_MS, SYNC_NIGHT_MS]);
    expect(states.at(-1)).toBe(SYNC_NIGHT_MS);
    sync.stop();
  });

  it("an interval function that fails or returns nonsense → 60 s", async () => {
    for (const bad of [() => Promise.reject(new Error("x")), () => Number.NaN, () => 0]) {
      const waits: number[] = [];
      const sync = startBundleSync({ call: unchanged, store, onState: () => {}, intervalMs: bad, setTimer: (_fn, ms) => waits.push(ms), clearTimer: () => {} });
      await sync.ready;
      expect(waits).toEqual([SYNC_DAY_MS]);
      sync.stop();
    }
  });
});
