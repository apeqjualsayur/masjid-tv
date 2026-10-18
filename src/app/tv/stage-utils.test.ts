import { describe, expect, it } from "vitest";
import { BURN_IN_PERIOD_MS, burnInOffset } from "./burn-in";
import { createFrameMonitor } from "./frame-monitor";

describe("burnInOffset", () => {
  it("stays within a 4 px range and is constant within a 10-minute slot", () => {
    for (let slot = 0; slot < 500; slot++) {
      const o = burnInOffset(slot * BURN_IN_PERIOD_MS);
      expect(Math.abs(o.x)).toBeLessThanOrEqual(2);
      expect(Math.abs(o.y)).toBeLessThanOrEqual(2);
      expect(burnInOffset(slot * BURN_IN_PERIOD_MS + BURN_IN_PERIOD_MS - 1)).toEqual(o);
    }
  });

  it("moves every 10 minutes and visits all 25 positions", () => {
    const seen = new Set<string>();
    for (let slot = 0; slot < 200; slot++) {
      const a = burnInOffset(slot * BURN_IN_PERIOD_MS);
      const b = burnInOffset((slot + 1) * BURN_IN_PERIOD_MS);
      expect(a).not.toEqual(b);
      seen.add(`${a.x},${a.y}`);
    }
    expect(seen.size).toBe(25);
  });
});

describe("frame monitor (auto lite)", () => {
  const run = (frameMs: number, seconds: number) => {
    const m = createFrameMonitor();
    const verdicts = [];
    for (let t = 0; t <= seconds * 1000; t += frameMs) {
      const v = m.push(t);
      if (v) verdicts.push(v);
    }
    return verdicts;
  };

  it("60 fps is ok", () => expect(run(16.7, 10.1)).toEqual(["ok"]));
  it("average above 50 ms over 10 s is slow", () => expect(run(80, 10.1)).toEqual(["slow"]));
  it("exactly 50 ms is not slow", () => expect(run(50, 10)).toEqual(["ok"]));
  it("no verdict before a full 10 s window", () => expect(run(80, 9)).toEqual([]));

  it("a long pause (hidden tab) restarts the window instead of counting as slow", () => {
    const m = createFrameMonitor();
    const verdicts: string[] = [];
    let t = 0;
    for (; t < 5000; t += 16) m.push(t);
    t += 60_000; // hidden for a minute
    for (const end = t + 10_100; t <= end; t += 16) {
      const v = m.push(t);
      if (v) verdicts.push(v);
    }
    expect(verdicts).toEqual(["ok"]);
  });
});