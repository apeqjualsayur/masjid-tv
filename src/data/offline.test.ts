// The four required scenarios (online, offline with cache, offline without cache, corrupted
// cache), run against the real IndexedDB store (fake-indexeddb) with a mocked network.
import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getClockOffset, setClockOffset } from "@/core";
import { idbMonthStore, monthKey, startSync, type MonthStore } from "./cache";
import { loadStoredClock } from "./clock-store";
import { createFallbackLoader } from "./fallback";
import { createPrayerData } from "./prayer-data";
import { UNAVAILABLE_MESSAGE } from "./types";
import { YEAR_2026, memoryStorage, mockNet, type MockNet } from "./__fixtures__/mock-api";

const OCT = YEAR_2026.months[9];
const NOV = YEAR_2026.months[10];
const DEVICE_NOW = Date.UTC(2026, 9, 17, 2, 0, 0); // Sat 17 Oct 2026, 10:00 MYT

let idb: IDBFactory;
beforeEach(() => {
  idb = new IDBFactory(); // fresh, empty IndexedDB per test
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => {
  setClockOffset(0);
  vi.restoreAllMocks();
});

/** One page load: a sync session plus a reader, sharing the given IndexedDB. */
async function boot(net: MockNet) {
  const store = idbMonthStore(idb);
  const storage = memoryStorage();
  const sync = startSync({ zone: "SGR01", store, fetchImpl: net.fetch, realNow: () => DEVICE_NOW, storage });
  await sync.ready;
  sync.stop();
  const data = createPrayerData({ store, loadYear: createFallbackLoader(net.fetch), liveKeys: sync.status.liveKeys });
  return { store, storage, sync, data };
}

describe("online", () => {
  it("fetches current + next month, stores them, serves them as live, applies the clock offset", async () => {
    const net = mockNet();
    const { store, storage, sync, data } = await boot(net);

    expect(net.calls).toContain("https://api.waktusolat.app/v2/solat/SGR01?year=2026&month=10");
    expect(net.calls).toContain("https://api.waktusolat.app/v2/solat/SGR01?year=2026&month=11");
    expect(await store.get(monthKey("SGR01", 2026, 10))).toMatchObject({ zone: "SGR01", month: 10 });
    expect(await store.get(monthKey("SGR01", 2026, 11))).toMatchObject({ month: 11 });

    const day = await data.getDay("SGR01", "2026-10-17");
    expect(day).toMatchObject({ status: "ok", source: "live", today: OCT.days[16], tomorrowImsak: OCT.days[17].times.imsak, tomorrowSubuh: OCT.days[17].times.subuh, fetchedAt: DEVICE_NOW });
    expect(sync.status.lastDataSync).toBe(DEVICE_NOW);
    expect(sync.status.lastClockSync).toBe(DEVICE_NOW);
    expect(loadStoredClock(storage)?.offsetMs).toBe(getClockOffset());
    expect(net.calls.some((u) => u.startsWith("/data/"))).toBe(false);
  });

  it("tomorrow Imsak crosses the month boundary (31 Oct to 1 Nov)", async () => {
    const { data } = await boot(mockNet());
    const day = await data.getDay("SGR01", "2026-10-31");
    expect(day.status === "ok" && day.tomorrowImsak).toBe(NOV.days[0].times.imsak);
  });
});

describe("offline with cache", () => {
  it("uses IndexedDB from an earlier online session", async () => {
    await boot(mockNet()); // yesterday: online
    const net = mockNet({ online: false }); // today: WiFi down
    const { data, sync } = await boot(net);

    expect(sync.status.lastDataSync).toBeNull();
    const day = await data.getDay("SGR01", "2026-10-17");
    expect(day).toMatchObject({ status: "ok", source: "cache", today: OCT.days[16], tomorrowImsak: OCT.days[17].times.imsak, fetchedAt: DEVICE_NOW });
    expect(net.calls.some((u) => u.startsWith("/data/"))).toBe(false);
  });
});

describe("offline without cache", () => {
  it("falls back to the bundled year file", async () => {
    const net = mockNet({ online: false });
    const { data } = await boot(net);
    const day = await data.getDay("SGR01", "2026-10-17");
    expect(day).toMatchObject({ status: "ok", source: "fallback", today: OCT.days[16], tomorrowImsak: OCT.days[17].times.imsak });
    expect(net.calls).toContain("/data/SGR01-2026.json");
  });

  it("covers dates outside the two cached months", async () => {
    await boot(mockNet()); // caches Oct + Nov
    const { data } = await boot(mockNet({ online: false }));
    expect(await data.getDay("SGR01", "2026-12-01")).toMatchObject({ status: "ok", source: "fallback" });
  });

  it("no cache and no bundled file: explicit unavailable, never guessed times", async () => {
    const { data } = await boot(mockNet({ online: false, bundled: false }));
    expect(await data.getDay("SGR01", "2026-10-17")).toEqual({ status: "unavailable", message: UNAVAILABLE_MESSAGE });
    expect(UNAVAILABLE_MESSAGE).toBe("Data waktu tidak tersedia");
  });

  it("tomorrow not published (31 Dec 2026, no 2027 data): today shown, tomorrowImsak null", async () => {
    const { data } = await boot(mockNet({ online: false }));
    expect(await data.getDay("SGR01", "2026-12-31")).toMatchObject({ status: "ok", source: "fallback", tomorrowImsak: null });
  });
});

describe("corrupted cache", () => {
  type Month = typeof OCT;
  const corruptions: [string, (m: Month) => unknown][] = [
    ["not an object", () => "garbage"],
    ["missing days", (m) => ({ ...m, days: m.days.slice(0, 20) })],
    ["NaN time", (m) => ({ ...m, days: m.days.map((d, i) => (i === 16 ? { ...d, times: { ...d.times, zohor: NaN } } : d)) })],
    ["times in seconds, not ms", (m) => ({ ...m, days: m.days.map((d) => ({ ...d, times: Object.fromEntries(Object.entries(d.times).map(([k, v]) => [k, v / 1000])) })) })],
    ["wrong month stored under the key", () => NOV],
  ];

  async function corruptOct(store: MonthStore, make: (m: Month) => unknown) {
    await (store as unknown as { put(k: string, v: unknown): Promise<void> }).put(monthKey("SGR01", 2026, 10), make(OCT));
  }

  for (const [name, make] of corruptions) {
    it(`${name}: discarded, falls back to the bundled file`, async () => {
      const store = idbMonthStore(idb);
      await corruptOct(store, make);
      const data = createPrayerData({ store, loadYear: createFallbackLoader(mockNet({ online: false }).fetch) });
      expect(await data.getDay("SGR01", "2026-10-17")).toMatchObject({ status: "ok", source: "fallback", today: OCT.days[16] });
      expect(await store.get(monthKey("SGR01", 2026, 10))).toBeUndefined(); // bad entry removed
    });
  }

  it("corrupted cache and no fallback: unavailable, not the corrupted times", async () => {
    const store = idbMonthStore(idb);
    await corruptOct(store, corruptions[2][1]);
    const data = createPrayerData({ store, loadYear: createFallbackLoader(mockNet({ online: false, bundled: false }).fetch) });
    expect(await data.getDay("SGR01", "2026-10-17")).toEqual({ status: "unavailable", message: UNAVAILABLE_MESSAGE });
  });

  it("an IndexedDB that cannot open behaves like an empty cache", async () => {
    const broken = { open: () => { throw new Error("SecurityError"); } } as unknown as IDBFactory;
    const store = idbMonthStore(broken);
    expect(await store.get("SGR01:2026-10")).toBeUndefined();
    const data = createPrayerData({ store, loadYear: createFallbackLoader(mockNet({ online: false }).fetch) });
    expect(await data.getDay("SGR01", "2026-10-17")).toMatchObject({ status: "ok", source: "fallback" });
  });

  it("a corrupted bundled file is also rejected", async () => {
    const badFile = async () => new Response(JSON.stringify({ zone: "SGR01", year: 2026, months: [{ ...OCT, days: [] }] }));
    const data = createPrayerData({ store: idbMonthStore(idb), loadYear: createFallbackLoader(badFile) });
    expect(await data.getDay("SGR01", "2026-10-17")).toMatchObject({ status: "unavailable" });
  });
});