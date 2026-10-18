import { describe, expect, it } from "vitest";
import { createClock, localDateKey, localParts, localToEpoch, nextDateKey, parseLocalDateTime, weekdayOfDateKey } from "./time";

/** A fake device clock we can move by hand. */
function fakeDevice(start: number) {
  let t = start;
  return { realNow: () => t, advance: (ms: number) => (t += ms) };
}

describe("Malaysia local time", () => {
  it("is UTC+8 regardless of the machine timezone", () => {
    const ms = Date.UTC(2026, 9, 17, 5, 1, 0); // 05:01 UTC
    expect(localParts(ms)).toMatchObject({ year: 2026, month: 10, day: 17, hour: 13, minute: 1, weekday: 6 });
  });
  it("round-trips local wall time", () => {
    const ms = localToEpoch(2026, 10, 17, 13, 1, 0);
    expect(ms).toBe(1792213260 * 1000); // the API's Zohor for 17 Oct 2026, SGR01
  });
  it("local date rolls over at Malaysian midnight, not UTC midnight", () => {
    expect(localDateKey(localToEpoch(2026, 10, 17, 23, 59, 59))).toBe("2026-10-17");
    expect(localDateKey(localToEpoch(2026, 10, 18, 0, 0, 0))).toBe("2026-10-18");
    expect(localDateKey(localToEpoch(2026, 10, 18, 7, 0, 0))).toBe("2026-10-18"); // 23:00 UTC on the 17th
  });
  it("weekday and next day of a date key", () => {
    expect(weekdayOfDateKey("2026-10-16")).toBe(5);
    expect(nextDateKey("2026-10-31")).toBe("2026-11-01");
    expect(nextDateKey("2026-12-31")).toBe("2027-01-01");
  });
});

describe("parseLocalDateTime (sim param)", () => {
  it("parses with and without seconds", () => {
    expect(parseLocalDateTime("2026-10-17T13:04:30")).toBe(localToEpoch(2026, 10, 17, 13, 4, 30));
    expect(parseLocalDateTime("2026-10-17T13:04")).toBe(localToEpoch(2026, 10, 17, 13, 4, 0));
  });
  it("rejects garbage and impossible dates", () => {
    expect(parseLocalDateTime("")).toBeNull();
    expect(parseLocalDateTime("tomorrow")).toBeNull();
    expect(parseLocalDateTime("2026-02-31T10:00")).toBeNull();
    expect(parseLocalDateTime("2026-10-17T25:00")).toBeNull();
  });
});

describe("clock now()", () => {
  const device = localToEpoch(2026, 10, 17, 10, 0, 0);

  it("returns device time when there is no offset", () => {
    const d = fakeDevice(device);
    const clock = createClock(d.realNow);
    expect(clock.nowMs()).toBe(device);
    expect(clock.now()).toBeInstanceOf(Date);
  });

  it("applies the stored server offset (device 3 min slow)", () => {
    const d = fakeDevice(device);
    const clock = createClock(d.realNow);
    clock.setOffset(3 * 60_000);
    expect(clock.nowMs()).toBe(device + 3 * 60_000);
    d.advance(1000);
    expect(clock.nowMs()).toBe(device + 3 * 60_000 + 1000);
    expect(clock.getOffset()).toBe(3 * 60_000);
  });

  it("ignores a non-finite offset", () => {
    const clock = createClock(fakeDevice(device).realNow);
    clock.setOffset(NaN);
    expect(clock.getOffset()).toBe(0);
  });

  it("sim starts at the given time and runs in real time", () => {
    const d = fakeDevice(device);
    const clock = createClock(d.realNow);
    clock.setOffset(-5000); // ignored while simulating
    const sim = parseLocalDateTime("2026-10-17T13:04:30")!;
    clock.setDebugTime({ simStartMs: sim });
    expect(clock.nowMs()).toBe(sim);
    d.advance(2000);
    expect(clock.nowMs()).toBe(sim + 2000);
  });

  it("sim with speed runs faster", () => {
    const d = fakeDevice(device);
    const clock = createClock(d.realNow);
    const sim = parseLocalDateTime("2026-10-17T13:04:30")!;
    clock.setDebugTime({ simStartMs: sim, speed: 10 });
    d.advance(6000);
    expect(clock.nowMs()).toBe(sim + 60_000);
  });

  it("speed alone speeds up from the current corrected time", () => {
    const d = fakeDevice(device);
    const clock = createClock(d.realNow);
    clock.setOffset(1000);
    clock.setDebugTime({ speed: 20 });
    expect(clock.nowMs()).toBe(device + 1000);
    d.advance(3000);
    expect(clock.nowMs()).toBe(device + 1000 + 60_000);
  });

  it("invalid speed falls back to 1, and null clears the override", () => {
    const d = fakeDevice(device);
    const clock = createClock(d.realNow);
    const sim = localToEpoch(2026, 10, 17, 12, 0, 0);
    clock.setDebugTime({ simStartMs: sim, speed: -3 });
    d.advance(1000);
    expect(clock.nowMs()).toBe(sim + 1000);
    clock.setDebugTime(null);
    expect(clock.nowMs()).toBe(device + 1000);
  });
});
