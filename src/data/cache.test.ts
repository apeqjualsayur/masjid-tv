import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getClockOffset, localToEpoch, setClockOffset } from "@/core";
import { CLOCK_RESYNC_MS, currentAndNextMonth, msUntilNextLocal, startSync } from "./cache";
import { restoreClockOffset, saveStoredClock } from "./clock-store";
import { findZone, ZONES } from "./zones";
import { memoryStorage, memoryStore, mockNet } from "./__fixtures__/mock-api";

const apiMonthCalls = (calls: string[]) => calls.filter((u) => u.includes("/v2/solat/")).map((u) => new URL(u).searchParams.get("month"));
const chronoCalls = (calls: string[]) => calls.filter((u) => u.endsWith("/chrono")).length;

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  setClockOffset(0);
});

describe("schedule helpers", () => {
  it("current + next month, wrapping the year", () => {
    expect(currentAndNextMonth(localToEpoch(2026, 10, 17, 10))).toEqual([{ year: 2026, month: 10 }, { year: 2026, month: 11 }]);
    expect(currentAndNextMonth(localToEpoch(2026, 12, 31, 23, 59))).toEqual([{ year: 2026, month: 12 }, { year: 2027, month: 1 }]);
  });

  it("time until the next local 00:10", () => {
    expect(msUntilNextLocal(localToEpoch(2026, 10, 17, 0, 0), 0, 10)).toBe(10 * 60_000);
    expect(msUntilNextLocal(localToEpoch(2026, 10, 17, 0, 10), 0, 10)).toBe(24 * 3600_000);
    expect(msUntilNextLocal(localToEpoch(2026, 10, 31, 23, 0), 0, 10)).toBe(70 * 60_000);
  });
});

describe("startSync timers", () => {
  function start(net = mockNet(), at = localToEpoch(2026, 10, 17, 23, 0, 0)) {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"] });
    vi.setSystemTime(at);
    const store = memoryStore();
    const storage = memoryStorage();
    const sync = startSync({ zone: "SGR01", store, fetchImpl: net.fetch, storage });
    return { net, store, storage, sync };
  }

  it("on boot: /chrono first, then current + next month", async () => {
    const { net, sync, store } = start();
    await sync.ready;
    expect(net.calls[0]).toBe("https://api.waktusolat.app/chrono");
    expect(apiMonthCalls(net.calls)).toEqual(["10", "11"]);
    expect([...store.map.keys()]).toEqual(["SGR01:2026-10", "SGR01:2026-11"]);
    sync.stop();
  });

  it("re-fetches the months daily at 00:10", async () => {
    const { net, sync } = start(); // boot at 23:00
    await sync.ready;
    await vi.advanceTimersByTimeAsync(70 * 60_000 - 1000); // 00:09:59
    expect(apiMonthCalls(net.calls)).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1000); // 00:10
    expect(apiMonthCalls(net.calls)).toHaveLength(4);
    await vi.advanceTimersByTimeAsync(24 * 3600_000); // next day 00:10
    expect(apiMonthCalls(net.calls)).toHaveLength(6);
    sync.stop();
  });

  it("re-syncs /chrono every 30 minutes and stores the offset", async () => {
    const net = mockNet({ serverAheadMs: 180_000 });
    const { sync, storage } = start(net, localToEpoch(2026, 10, 17, 10, 0, 0));
    await sync.ready;
    expect(chronoCalls(net.calls)).toBe(1);
    expect(Math.abs(getClockOffset() - 180_000)).toBeLessThanOrEqual(1000);

    net.serverAheadMs = 240_000; // device drifted another minute
    await vi.advanceTimersByTimeAsync(CLOCK_RESYNC_MS);
    expect(chronoCalls(net.calls)).toBe(2);
    expect(Math.abs(getClockOffset() - 240_000)).toBeLessThanOrEqual(1000);
    expect(JSON.parse(storage.m.get("masjid-tv:clock")!).offsetMs).toBe(getClockOffset());
    await vi.advanceTimersByTimeAsync(CLOCK_RESYNC_MS * 3);
    expect(chronoCalls(net.calls)).toBe(5);
    sync.stop();
  });

  it("boots offline, then retries months on the next 30-minute tick once back online", async () => {
    const net = mockNet({ online: false });
    const { sync, store } = start(net, localToEpoch(2026, 10, 17, 10, 0, 0));
    await sync.ready;
    expect(store.map.size).toBe(0);
    expect(sync.status.lastDataSync).toBeNull();

    net.online = true;
    await vi.advanceTimersByTimeAsync(CLOCK_RESYNC_MS);
    expect(store.map.size).toBe(2);
    expect(sync.status.lastDataSync).not.toBeNull();

    const before = apiMonthCalls(net.calls).length;
    await vi.advanceTimersByTimeAsync(CLOCK_RESYNC_MS); // no longer pending: no extra month fetch
    expect(apiMonthCalls(net.calls).length).toBe(before);
    sync.stop();
  });

  it("stop() cancels all timers", async () => {
    const { net, sync } = start();
    await sync.ready;
    sync.stop();
    const n = net.calls.length;
    await vi.advanceTimersByTimeAsync(3 * 24 * 3600_000);
    expect(net.calls.length).toBe(n);
  });
});

describe("stored clock offset", () => {
  it("is restored into now() on boot", () => {
    const storage = memoryStorage();
    saveStoredClock({ offsetMs: 123_000, syncedAt: 1 }, storage);
    expect(restoreClockOffset(storage)).toEqual({ offsetMs: 123_000, syncedAt: 1 });
    expect(getClockOffset()).toBe(123_000);
  });

  it("ignores missing or corrupted values", () => {
    const storage = memoryStorage();
    expect(restoreClockOffset(storage)).toBeNull();
    storage.setItem("masjid-tv:clock", "{not json");
    expect(restoreClockOffset(storage)).toBeNull();
    expect(getClockOffset()).toBe(0);
  });
});

describe("zones", () => {
  it("bundled list from /zones includes the pilot zone", () => {
    expect(ZONES.length).toBeGreaterThanOrEqual(50);
    expect(findZone("sgr01")).toMatchObject({ jakimCode: "SGR01", negeri: "Selangor" });
    expect(findZone("XXX99")).toBeUndefined();
  });
});