import { afterEach, describe, expect, it, vi } from "vitest";
import { detectTimeUnit, fetchClockOffset, fetchMonth, parseMonthResponse } from "./api";
import { YEAR_2026, mockNet, toApiResponse } from "./__fixtures__/mock-api";

const OCT = YEAR_2026.months[9];
const rawOct = () => toApiResponse(OCT);

afterEach(() => vi.restoreAllMocks());

describe("time unit check", () => {
  it("recognises epoch seconds, epoch ms and clock strings", () => {
    expect(detectTimeUnit(1792213260)).toBe("epoch_s");
    expect(detectTimeUnit("1792213260")).toBe("epoch_s");
    expect(detectTimeUnit(1792213260000)).toBe("epoch_ms");
    expect(detectTimeUnit("13:01:00")).toBe("clock_string");
    expect(detectTimeUnit("13:01")).toBe("clock_string");
    expect(detectTimeUnit(12345)).toBeNull();
    expect(detectTimeUnit(null)).toBeNull();
  });
});

describe("parseMonthResponse", () => {
  it("epoch seconds (the real format): maps API fields to waktu, in ms", () => {
    const m = parseMonthResponse(rawOct(), "SGR01", 2026, 10, 1);
    expect(m.days).toHaveLength(31);
    expect(m.days[16]).toEqual(OCT.days[16]);
    expect(m.days[16].times.zohor).toBe(1792213260 * 1000); // 17 Oct, 13:01
    expect(m.days[16].hijri).toBe("1448-05-06");
  });

  it("adapts epoch milliseconds and logs a warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const raw = rawOct();
    for (const p of raw.prayers) for (const k of ["imsak", "fajr", "syuruk", "dhuhr", "asr", "maghrib", "isha"] as const) p[k] *= 1000;
    expect(parseMonthResponse(raw, "SGR01", 2026, 10, 1).days[16]).toEqual(OCT.days[16]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"epoch_ms", not Unix epoch seconds'));
  });

  it("adapts HH:MM:SS local-time strings and logs a warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const raw = rawOct() as unknown as { prayers: Record<string, unknown>[] };
    const hhmmss = (s: number) => new Date(s * 1000 + 8 * 3600e3).toISOString().slice(11, 19);
    for (const p of raw.prayers) for (const k of ["imsak", "fajr", "syuruk", "dhuhr", "asr", "maghrib", "isha"]) p[k] = hhmmss(p[k] as number);
    expect(parseMonthResponse(raw, "SGR01", 2026, 10, 1).days[16]).toEqual(OCT.days[16]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("clock_string"));
  });

  it("rejects responses that cannot be trusted", () => {
    const missingDay = rawOct();
    missingDay.prayers.pop();
    expect(() => parseMonthResponse(missingDay, "SGR01", 2026, 10, 1)).toThrow(/validation/);

    const outOfOrder = rawOct();
    outOfOrder.prayers[3].asr = outOfOrder.prayers[3].dhuhr - 60;
    expect(() => parseMonthResponse(outOfOrder, "SGR01", 2026, 10, 1)).toThrow(/validation/);

    const garbage = rawOct() as unknown as { prayers: Record<string, unknown>[] };
    garbage.prayers[0].imsak = "soon";
    expect(() => parseMonthResponse(garbage, "SGR01", 2026, 10, 1)).toThrow(/Unrecognised time format/);

    expect(() => parseMonthResponse(rawOct(), "WLY01", 2026, 10, 1)).toThrow(/does not match/);
    expect(() => parseMonthResponse({ message: "No data" }, "SGR01", 2026, 10, 1)).toThrow(/No prayers/);
  });
});

describe("fetchMonth", () => {
  it("fetches the documented URL", async () => {
    const net = mockNet();
    const m = await fetchMonth("sgr01", 2026, 10, net.fetch);
    expect(net.calls).toEqual(["https://api.waktusolat.app/v2/solat/SGR01?year=2026&month=10"]);
    expect(m.zone).toBe("SGR01");
  });

  it("an answer from the service worker cache counts as offline, not as a fresh fetch", async () => {
    const net = mockNet();
    const viaSw: typeof net.fetch = async (url, init) => {
      const r = await net.fetch(url, init);
      return new Response(r.body, { status: 200, headers: { "x-sw-cache": "hit" } });
    };
    await expect(fetchMonth("SGR01", 2026, 10, viaSw)).rejects.toThrow(/offline/);
    await expect(fetchClockOffset(viaSw)).rejects.toThrow(/cached time is never used/);
  });

  it("throws on HTTP errors and when offline", async () => {
    await expect(fetchMonth("SGR01", 2027, 1, mockNet().fetch)).rejects.toThrow(/HTTP 404/);
    await expect(fetchMonth("SGR01", 2026, 10, mockNet({ online: false }).fetch)).rejects.toThrow(/Failed to fetch/);
  });
});

describe("fetchClockOffset", () => {
  it("offset = server - device (device 3 minutes slow)", async () => {
    const net = mockNet({ serverAheadMs: 3 * 60_000 });
    const offset = await fetchClockOffset(net.fetch);
    expect(Math.abs(offset - 3 * 60_000)).toBeLessThanOrEqual(1000); // /chrono has 1 s resolution
  });

  it("rejects a malformed /chrono response", async () => {
    const bad = async () => new Response(JSON.stringify({ time: "now" }), { status: 200 });
    await expect(fetchClockOffset(bad)).rejects.toThrow(/Unexpected \/chrono/);
  });
});
