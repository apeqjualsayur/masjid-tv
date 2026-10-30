import { describe, expect, it } from "vitest";
import { CONFIG, dayTimes } from "./__fixtures__/sgr01-2026-10";
import { RING_FALLBACK_MS, countdownRing, formatCountdownShort } from "./countdown-ring";
import { buildDisplayState, type DisplayInputs } from "./display-state";
import { parseLocalDateTime } from "./time";

const MIN = 60_000;
const state = (when: string, extra: Partial<DisplayInputs> = {}) =>
  buildDisplayState({
    at: parseLocalDateTime(when)!,
    today: dayTimes(17), // Sat 17 Oct 2026: Imsak 5:40, Subuh 5:50, Syuruk 6:56, Zohor 1:01, Asar 4:18, Maghrib 7:01, Isyak 8:11
    tomorrowImsak: dayTimes(18).times.imsak,
    tomorrowSubuh: dayTimes(18).times.subuh,
    clock24h: false,
    showArabic: true,
    ticker: [],
    lite: false,
    masjid: { fullName: "M", shortName: "M" },
    modeConfig: CONFIG,
    ...extra,
  });
const T = dayTimes(17).times;

describe("countdown ring", () => {
  it("short label rounds up to the minute", () => {
    expect(formatCountdownShort(109 * MIN)).toBe("1j 49m");
    expect(formatCountdownShort(49 * MIN - 1)).toBe("49m");
    expect(formatCountdownShort(NaN)).toBe("");
  });

  it("fraction of the span since the latest waktu that began (Zohor → Asar)", () => {
    const s = state("2026-10-17T14:00:00");
    const r = countdownRing(s);
    expect(r.remaining).toBeCloseTo((T.asar - s.now.getTime()) / (T.asar - T.zohor));
    expect(r.label).toBe(formatCountdownShort(T.asar - s.now.getTime()));
  });

  it("Syuruk → Zohor is one span (markers count as a start)", () => {
    const s = state("2026-10-17T10:00:00");
    expect(countdownRing(s).remaining).toBeCloseTo((T.zohor - s.now.getTime()) / (T.zohor - T.syuruk));
  });

  it("after Isyak the span runs to tomorrow's Subuh; before Imsak it uses the fallback span", () => {
    const late = state("2026-10-17T22:00:00");
    const sub = dayTimes(18).times.subuh;
    expect(countdownRing(late).remaining).toBeCloseTo((sub - late.now.getTime()) / (sub - T.isyak));
    const early = state("2026-10-17T04:50:00");
    expect(countdownRing(early).remaining).toBeCloseTo(Math.min(1, (T.subuh - early.now.getTime()) / RING_FALLBACK_MS));
  });

  it("stepMs 60 000 changes only once a minute", () => {
    const a = countdownRing(state("2026-10-17T14:00:05"), 60_000);
    const b = countdownRing(state("2026-10-17T14:00:55"), 60_000);
    expect(a).toEqual(b);
    expect(countdownRing(state("2026-10-17T14:00:05")).remaining).not.toBe(countdownRing(state("2026-10-17T14:00:55")).remaining);
  });
});
