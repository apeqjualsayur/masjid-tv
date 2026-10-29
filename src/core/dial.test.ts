import { describe, expect, it } from "vitest";
import { dialAngle, dialSweep, handAngles, withinNextHours } from "./dial";
import { parseLocalDateTime } from "./time";

const at = (s: string) => parseLocalDateTime(s)!;
const H = 3_600_000;

describe("analogue dial geometry (Malaysia time)", () => {
  it("dialAngle: 12-hour face, 0° at 12, 90° at 3, PM wraps", () => {
    expect(dialAngle(at("2026-10-17T00:00:00"))).toBe(0);
    expect(dialAngle(at("2026-10-17T03:00:00"))).toBe(90);
    expect(dialAngle(at("2026-10-17T15:00:00"))).toBe(90);
    expect(dialAngle(at("2026-10-17T13:01:00"))).toBeCloseTo(30.5);
  });

  it("handAngles at 1:20:36 pm: hour, minute (smooth), second (steps)", () => {
    const h = handAngles(at("2026-10-17T13:20:36"));
    expect(h.hour).toBeCloseTo(40);
    expect(h.minute).toBeCloseTo(123.6); // (20 + 36/60) × 6
    expect(h.second).toBe(216);
  });

  it("dialSweep: clockwise from a waktu to now; 0 when unknown or backwards; full turn beyond 12 h", () => {
    expect(dialSweep(at("2026-10-17T13:00:00"), at("2026-10-17T16:00:00"))).toBeCloseTo(90);
    expect(dialSweep(at("2026-10-17T11:00:00"), at("2026-10-17T13:00:00"))).toBeCloseTo(60); // across 12 o'clock
    expect(dialSweep(NaN, at("2026-10-17T13:00:00"))).toBe(0);
    expect(dialSweep(at("2026-10-17T13:00:00"), at("2026-10-17T12:00:00"))).toBe(0);
    expect(dialSweep(at("2026-10-17T05:50:00"), at("2026-10-17T18:00:00"))).toBe(360);
  });

  it("withinNextHours: after now and at most 12 h ahead", () => {
    const now = at("2026-10-17T13:00:00");
    expect(withinNextHours(now + 1, now)).toBe(true);
    expect(withinNextHours(now + 12 * H, now)).toBe(true);
    expect(withinNextHours(now + 12 * H + 1, now)).toBe(false);
    expect(withinNextHours(now, now)).toBe(false);
    expect(withinNextHours(NaN, now)).toBe(false);
  });
});
