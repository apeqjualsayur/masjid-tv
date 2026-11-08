import { describe, expect, it } from "vitest";
import { CONFIG, dayTimes } from "./__fixtures__/sgr01-2026-10";
import { buildDisplayState, type DisplayState, type ForcedModeInput } from "./display-state";
import type { ModeConfig } from "./modes";
import { CUE_TOLERANCE_MS, cueKey, cueToleranceMs, soundCue, type CueTick, type SoundCue } from "./soundCues";
import { parseLocalDateTime } from "./time";
import type { DayTimes, LayoutKey, PrayerKey } from "./types";

// Saturday 17 Oct 2026 (SGR01): subuh 5:50, zohor 13:01, asar 16:18, maghrib 19:01, isyak 20:11.
// Friday 16 Oct 2026: zohor 13:02.
const SAT = dayTimes(17);
const FRI = dayTimes(16);
const at = (s: string) => parseLocalDateTime(s)!;
const SEC = 1000;
const MIN = 60_000;
const PRAYERS: PrayerKey[] = ["subuh", "zohor", "asar", "maghrib", "isyak"];

function state(day: DayTimes, t: number, opts: { cfg?: ModeConfig; layout?: LayoutKey; forced?: ForcedModeInput; friday?: boolean } = {}): DisplayState {
  return buildDisplayState({
    at: t,
    today: day,
    tomorrowImsak: null,
    tomorrowSubuh: null,
    forceFriday: opts.friday,
    clock24h: false,
    showArabic: true,
    ticker: [],
    lite: false,
    masjid: { fullName: "Masjid Ujian", shortName: "MU" },
    modeConfig: opts.cfg ?? CONFIG,
    forced: opts.forced,
    layout: opts.layout ?? "full",
  });
}

const tickOf = (s: DisplayState, t: number, layout: LayoutKey = "full", forced = false): CueTick => ({
  at: t,
  mode: s.mode,
  waktu: s.modeTarget?.key,
  modeStartMs: s.modeStartMs,
  layout,
  isFriday: s.isFriday,
  forced,
});

/**
 * What the TV does: one tick per `stepMs` of clock time from `from` to `to`, remembering the previous
 * tick and the cues already played. `cfgAt` lets a test change the masjid's settings mid-run.
 */
function run(
  day: DayTimes,
  from: number,
  to: number,
  o: { stepMs?: number; layout?: LayoutKey; toleranceMs?: number; cfgAt?: (t: number) => ModeConfig; ticks?: number[] } = {},
): { cue: SoundCue; at: number }[] {
  const out: { cue: SoundCue; at: number }[] = [];
  const played = new Set<string>();
  let prev: CueTick | null = null;
  const times = o.ticks ?? (() => {
    const list: number[] = [];
    for (let t = from; t <= to; t += o.stepMs ?? SEC) list.push(t);
    return list;
  })();
  for (const t of times) {
    const s = state(day, t, { cfg: o.cfgAt?.(t), layout: o.layout });
    const cur = tickOf(s, t, o.layout);
    const cue = soundCue(prev, cur, { firstTick: prev === null, toleranceMs: o.toleranceMs, played });
    if (cue) {
      played.add(cueKey(cue, cur.modeStartMs ?? t));
      out.push({ cue, at: t });
    }
    prev = cur;
  }
  return out;
}

const azanAt = (day: DayTimes, w: PrayerKey) => day.times[w];
const iqamahEndAt = (day: DayTimes, w: PrayerKey) => day.times[w] + (CONFIG.durations.azanMin + CONFIG.iqamahMin[w]) * MIN;

describe("each prayer: azan cue on entering AZAN, iqamah cue on entering SOLAT", () => {
  for (const w of PRAYERS) {
    it(w, () => {
      const t = azanAt(SAT, w);
      expect(run(SAT, t - 6 * MIN, t + 40 * MIN)).toEqual([
        { cue: { event: "azan", waktu: w }, at: t },
        { cue: { event: "iqamah", waktu: w }, at: iqamahEndAt(SAT, w) },
      ]);
    });
  }

  it("never for Imsak or Syuruk (a whole day, second by second, gives exactly 10 cues)", () => {
    const cues = run(SAT, at("2026-10-17T05:00:00"), at("2026-10-17T21:00:00"));
    expect(cues).toHaveLength(10);
    expect(cues.every((c) => PRAYERS.includes(c.cue.waktu))).toBe(true);
    expect(cues.some((c) => c.at === SAT.times.imsak || c.at === SAT.times.syuruk)).toBe(false);
    // A tick that somehow names a marker never plays.
    expect(soundCue({ at: 0, mode: "pre_azan", layout: "full", isFriday: false }, { at: 1, mode: "azan", waktu: "imsak", modeStartMs: 1, layout: "full", isFriday: false }, { firstTick: false })).toBeNull();
  });
});

describe("Friday Zohor (Jumaat)", () => {
  it("azan cue yes, no iqamah cue on khutbah → solat", () => {
    const t = azanAt(FRI, "zohor");
    expect(run(FRI, t - 6 * MIN, t + 60 * MIN)).toEqual([{ cue: { event: "azan", waktu: "zohor" }, at: t }]);
  });

  it("the other Friday prayers keep their iqamah cue", () => {
    const t = azanAt(FRI, "asar");
    expect(run(FRI, t - MIN, t + 30 * MIN).map((c) => c.cue.event)).toEqual(["azan", "iqamah"]);
  });
});

describe("reload or resume in the middle of a mode", () => {
  const t = azanAt(SAT, "zohor");

  it("reload mid-AZAN: no azan cue; the later live SOLAT entry still plays the iqamah cue", () => {
    expect(run(SAT, t + 30 * SEC, t + 20 * MIN)).toEqual([{ cue: { event: "iqamah", waktu: "zohor" }, at: iqamahEndAt(SAT, "zohor") }]);
  });

  it("reload mid-IQAMAH: no cue on load", () => {
    const end = iqamahEndAt(SAT, "zohor");
    expect(run(SAT, end - 5 * MIN, end - SEC)).toEqual([]);
  });

  it("reload exactly at the boundary (first tick): no cue", () => {
    expect(run(SAT, t, t + 2 * SEC)).toEqual([]);
    expect(run(SAT, iqamahEndAt(SAT, "zohor"), iqamahEndAt(SAT, "zohor") + 2 * SEC)).toEqual([]);
  });

  it("reload mid-SOLAT: no cue", () => {
    const end = iqamahEndAt(SAT, "zohor");
    expect(run(SAT, end + 60 * SEC, end + 10 * MIN)).toEqual([]);
  });
});

describe("clock jumps", () => {
  const t = azanAt(SAT, "zohor");

  it("a 10 s jump that lands 5 s past the boundary: no cue", () => {
    expect(run(SAT, 0, 0, { ticks: [t - 7 * SEC, t - 6 * SEC, t - 5 * SEC, t + 5 * SEC, t + 6 * SEC] })).toEqual([]);
  });

  it("a 10 s jump that lands 2 s past the boundary: the cue still plays (within 3 s)", () => {
    expect(run(SAT, 0, 0, { ticks: [t - 9 * SEC, t - 8 * SEC, t + 2 * SEC] })).toEqual([{ cue: { event: "azan", waktu: "zohor" }, at: t + 2 * SEC }]);
  });

  it("exactly 3 s past plays, 3 s + 1 ms does not", () => {
    expect(run(SAT, 0, 0, { ticks: [t - SEC, t + CUE_TOLERANCE_MS] })).toHaveLength(1);
    expect(run(SAT, 0, 0, { ticks: [t - SEC, t + CUE_TOLERANCE_MS + 1] })).toEqual([]);
  });

  it("the clock going back across the boundary and forward again: still one cue", () => {
    expect(run(SAT, 0, 0, { ticks: [t - SEC, t, t + SEC, t - 2 * SEC, t - SEC, t, t + SEC] })).toEqual([{ cue: { event: "azan", waktu: "zohor" }, at: t }]);
  });
});

describe("sped-up clock (?speed=)", () => {
  const t = azanAt(SAT, "zohor");

  it("speed=10: one tick per simulated second, both cues play", () => {
    expect(cueToleranceMs(10)).toBe(3000);
    const cues = run(SAT, t - 6 * MIN, t + 40 * MIN, { stepMs: 1000, toleranceMs: cueToleranceMs(10) });
    expect(cues.map((c) => c.cue.event)).toEqual(["azan", "iqamah"]);
  });

  it("speed=100: ticks are 5 simulated seconds apart; the wider tolerance keeps both cues", () => {
    expect(cueToleranceMs(100)).toBe(10_000);
    // Off-grid: the first tick after each boundary lands 4 s past it.
    const from = t - 6 * MIN + 4 * SEC;
    expect(run(SAT, from, t + 40 * MIN, { stepMs: 5000, toleranceMs: cueToleranceMs(100) }).map((c) => c.cue.event)).toEqual(["azan", "iqamah"]);
    // With the plain 3 s tolerance those ticks would miss them.
    expect(run(SAT, from, t + 40 * MIN, { stepMs: 5000, toleranceMs: 3000 })).toEqual([]);
  });

  it("real time keeps 3 s", () => {
    expect(cueToleranceMs()).toBe(3000);
    expect(cueToleranceMs(1)).toBe(3000);
  });
});

describe("iqamahMin changed while the TV is running (Tetapan)", () => {
  const t = azanAt(SAT, "zohor");
  const with_ = (zohor: number): ModeConfig => ({ ...CONFIG, iqamahMin: { ...CONFIG.iqamahMin, zohor } });

  it("shortened so solat started a minute ago: no iqamah cue (the boundary passed long ago)", () => {
    const change = t + 9 * MIN; // iqamah 13:04–13:14; at 13:10 it becomes 5 min → solat since 13:09
    const cues = run(SAT, t - MIN, t + 30 * MIN, { cfgAt: (x) => (x >= change ? with_(5) : CONFIG) });
    expect(cues.map((c) => c.cue.event)).toEqual(["azan"]);
  });

  it("shortened so solat starts right now: the cue plays once", () => {
    const change = t + 9 * MIN; // 6 min of iqamah → solat at 13:10, exactly the tick of the change
    const cues = run(SAT, t - MIN, t + 30 * MIN, { cfgAt: (x) => (x >= change ? with_(6) : CONFIG) });
    expect(cues).toEqual([
      { cue: { event: "azan", waktu: "zohor" }, at: t },
      { cue: { event: "iqamah", waktu: "zohor" }, at: change },
    ]);
  });

  it("lengthened during solat (back to iqamah, then solat again): still one iqamah cue", () => {
    const change = t + 14 * MIN; // solat since 13:14; at 13:15 iqamah becomes 12 min → iqamah until 13:16
    const cues = run(SAT, t - MIN, t + 40 * MIN, { cfgAt: (x) => (x >= change ? with_(12) : CONFIG) });
    expect(cues.map((c) => [c.cue.event, c.at])).toEqual([
      ["azan", t],
      ["iqamah", iqamahEndAt(SAT, "zohor")],
    ]);
  });
});

describe("poster layout", () => {
  it("never a cue: the engine keeps poster screens in normal mode", () => {
    const t = azanAt(SAT, "zohor");
    expect(run(SAT, t - 6 * MIN, t + 40 * MIN, { layout: "poster" })).toEqual([]);
  });

  it("never a cue even if a tick says azan", () => {
    const prev: CueTick = { at: 0, mode: "pre_azan", waktu: "zohor", layout: "poster", isFriday: false };
    expect(soundCue(prev, { ...prev, at: 1, mode: "azan", modeStartMs: 1 }, { firstTick: false })).toBeNull();
    expect(soundCue(null, { at: 1, mode: "azan", waktu: "zohor", modeStartMs: 1, layout: "poster", isFriday: false, forced: true }, { firstTick: true })).toBeNull();
  });
});

describe("one cue per transition", () => {
  it("two consecutive ticks in the new mode produce one cue", () => {
    const t = azanAt(SAT, "zohor");
    expect(run(SAT, 0, 0, { ticks: [t - SEC, t, t + SEC] })).toHaveLength(1);
  });

  it("the same tick rendered twice (a re-render) produces one cue", () => {
    const t = azanAt(SAT, "zohor");
    expect(run(SAT, 0, 0, { ticks: [t - SEC, t, t] })).toHaveLength(1);
  });
});

describe("debug-forced modes (?mode=) fire on entry", () => {
  const t = at("2026-10-17T10:00:00");
  const forcedRun = (mode: ForcedModeInput["mode"], target: PrayerKey, friday = false) => {
    const forced: ForcedModeInput = { mode, target, sinceMs: t };
    const out: (SoundCue | null)[] = [];
    let prev: CueTick | null = null;
    for (const x of [t, t + SEC, t + 2 * SEC]) {
      const s = state(friday ? FRI : SAT, x, { forced, friday });
      const cur = tickOf(s, x, "full", true);
      out.push(soundCue(prev, cur, { firstTick: prev === null }));
      prev = cur;
    }
    return out;
  };

  it("mode=azan plays the azan cue on the first tick, once", () => {
    expect(forcedRun("azan", "zohor")).toEqual([{ event: "azan", waktu: "zohor" }, null, null]);
  });

  it("mode=solat plays the iqamah cue, except for Friday Zohor", () => {
    expect(forcedRun("solat", "asar")).toEqual([{ event: "iqamah", waktu: "asar" }, null, null]);
    expect(forcedRun("solat", "zohor", true)).toEqual([null, null, null]);
  });

  it("mode=pre_azan / iqamah / khutbah play nothing", () => {
    expect(forcedRun("pre_azan", "zohor")).toEqual([null, null, null]);
    expect(forcedRun("iqamah", "zohor")).toEqual([null, null, null]);
    expect(forcedRun("khutbah", "zohor", true)).toEqual([null, null, null]);
  });
});

describe("DisplayState.modeStartMs", () => {
  it("is when the mode began, and undefined in normal mode or on a poster screen", () => {
    const t = azanAt(SAT, "zohor");
    expect(state(SAT, t + 30 * SEC).modeStartMs).toBe(t);
    expect(state(SAT, t - 10 * MIN).modeStartMs).toBeUndefined();
    expect(state(SAT, t + 30 * SEC, { layout: "poster" }).modeStartMs).toBeUndefined();
  });
});
