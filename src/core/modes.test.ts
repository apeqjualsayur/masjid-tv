import { describe, expect, it } from "vitest";
import { CONFIG, dayTimes } from "./__fixtures__/sgr01-2026-10";
import { computeMode, forcedMode, prayerWindows } from "./modes";
import { parseLocalDateTime } from "./time";

// Saturday 17 Oct 2026: zohor 13:01. Friday 16 Oct 2026: zohor 13:02.
const sat = dayTimes(17).times;
const fri = dayTimes(16).times;
const at = (s: string) => parseLocalDateTime(s)!;
const satMode = (t: string) => computeMode(sat, false, CONFIG, at(`2026-10-17T${t}`));

/** Step second by second and record each mode change. */
function transitions(times: typeof sat, isFriday: boolean, from: string, to: string) {
  const out: { mode: string; at: number }[] = [];
  for (let t = at(from); t <= at(to); t += 1000) {
    const m = computeMode(times, isFriday, CONFIG, t).mode;
    if (out.at(-1)?.mode !== m) out.push({ mode: m, at: t });
  }
  return out;
}

describe("weekday sequence around Zohor", () => {
  it("normal > pre_azan > azan > iqamah > solat > normal at the configured times", () => {
    expect(transitions(sat, false, "2026-10-17T12:50:00", "2026-10-17T13:40:00")).toEqual([
      { mode: "normal", at: at("2026-10-17T12:50:00") },
      { mode: "pre_azan", at: at("2026-10-17T12:56:00") },
      { mode: "azan", at: at("2026-10-17T13:01:00") },
      { mode: "iqamah", at: at("2026-10-17T13:04:00") },
      { mode: "solat", at: at("2026-10-17T13:14:00") },
      { mode: "normal", at: at("2026-10-17T13:26:00") },
    ]);
  });

  it("modes target the prayer and report remaining seconds and progress", () => {
    expect(satMode("12:57:00")).toMatchObject({ mode: "pre_azan", target: "zohor", remainingSec: 240 });
    expect(satMode("13:02:30")).toMatchObject({ mode: "azan", target: "zohor", remainingSec: 90, progress: 0.5 });
    expect(satMode("13:04:00")).toMatchObject({ mode: "iqamah", remainingSec: 600, progress: 0 });
    expect(satMode("13:09:00")).toMatchObject({ mode: "iqamah", remainingSec: 300, progress: 0.5 });
    expect(satMode("13:13:59")).toMatchObject({ mode: "iqamah", remainingSec: 1 });
    expect(satMode("13:14:00")).toMatchObject({ mode: "solat", remainingSec: 720, progress: 0 });
  });

  it("boundary seconds: pre_azan starts exactly 5 min before, solat ends exactly on time", () => {
    expect(satMode("12:55:59").mode).toBe("normal");
    expect(satMode("12:56:00").mode).toBe("pre_azan");
    expect(satMode("13:25:59").mode).toBe("solat");
    expect(satMode("13:26:00")).toEqual({ mode: "normal" });
  });
});

describe("Friday Zohor", () => {
  it("azan > khutbah (40 min, no iqamah) > solat > normal", () => {
    expect(transitions(fri, true, "2026-10-16T12:50:00", "2026-10-16T14:10:00")).toEqual([
      { mode: "normal", at: at("2026-10-16T12:50:00") },
      { mode: "pre_azan", at: at("2026-10-16T12:57:00") },
      { mode: "azan", at: at("2026-10-16T13:02:00") },
      { mode: "khutbah", at: at("2026-10-16T13:05:00") },
      { mode: "solat", at: at("2026-10-16T13:45:00") },
      { mode: "normal", at: at("2026-10-16T13:57:00") },
    ]);
    expect(computeMode(fri, true, CONFIG, at("2026-10-16T13:25:00"))).toMatchObject({
      mode: "khutbah", target: "zohor", remainingSec: 1200, progress: 0.5,
    });
  });

  it("other Friday prayers still have iqamah", () => {
    expect(computeMode(fri, true, CONFIG, at("2026-10-16T16:22:00"))).toMatchObject({ mode: "iqamah", target: "asar" });
  });
});

describe("per-waktu iqamah minutes", () => {
  it("Maghrib uses 7 minutes", () => {
    // maghrib 19:01: azan 19:01-19:04, iqamah 19:04-19:11
    expect(satMode("19:04:00")).toMatchObject({ mode: "iqamah", target: "maghrib", remainingSec: 420 });
    expect(satMode("19:11:00").mode).toBe("solat");
  });
  it("each prayer of the day gets its own sequence", () => {
    expect(satMode("05:47:00")).toMatchObject({ mode: "pre_azan", target: "subuh" });
    expect(satMode("16:18:00")).toMatchObject({ mode: "azan", target: "asar" });
    expect(satMode("20:20:00")).toMatchObject({ mode: "iqamah", target: "isyak" });
  });
});

describe("markers never trigger modes", () => {
  it("Imsak (5:40) and Syuruk (6:56) pass in normal mode", () => {
    for (const [from, to] of [["05:30:00", "05:44:59"], ["06:20:00", "07:30:00"]]) {
      const ts = transitions(sat, false, `2026-10-17T${from}`, `2026-10-17T${to}`);
      expect(ts.map((t) => t.mode)).toEqual(["normal"]);
    }
  });
  it("just after midnight is normal", () => {
    expect(satMode("00:00:30")).toEqual({ mode: "normal" });
  });
});

describe("config edge cases", () => {
  it("preAzanMin 0 skips the banner", () => {
    const cfg = { ...CONFIG, durations: { ...CONFIG.durations, preAzanMin: 0 } };
    expect(prayerWindows("zohor", sat.zohor, false, cfg).map((w) => w.mode)).toEqual(["azan", "iqamah", "solat"]);
    expect(computeMode(sat, false, cfg, sat.zohor - 1000).mode).toBe("normal");
  });
});

describe("forcedMode (debug mode=)", () => {
  const since = at("2026-10-17T10:00:00");
  it("counts down from the start of the override", () => {
    expect(forcedMode("iqamah", "maghrib", since, CONFIG, since)).toMatchObject({ mode: "iqamah", remainingSec: 420, progress: 0 });
    expect(forcedMode("khutbah", "zohor", since, CONFIG, since + 20 * 60_000)).toMatchObject({ remainingSec: 1200, progress: 0.5 });
  });
  it("holds at the end instead of moving on", () => {
    expect(forcedMode("azan", "asar", since, CONFIG, since + 60 * 60_000)).toMatchObject({ mode: "azan", remainingSec: 0, progress: 1 });
  });
  it("normal is just normal", () => {
    expect(forcedMode("normal", "asar", since, CONFIG, since)).toEqual({ mode: "normal" });
  });
});
