// PRD section 12, Phase 1 acceptance criteria 1, 2, 3 and 6, run end to end through the
// simulated clock (sim + speed) the way the TV page will use it.
//
// Note: the PRD example uses "13:04:00" for PRE_AZAN, assuming Zohor at about 13:05.
// The real SGR01 data puts Zohor at 13:01 (Sat 17 Oct 2026) and 13:02 (Fri 16 Oct),
// so the sim here starts 4 minutes before the real Zohor, which is the same situation.
import { describe, expect, it } from "vitest";
import { CONFIG, dayTimes, scheduleInput } from "./__fixtures__/sgr01-2026-10";
import { computeMode } from "./modes";
import { computeSchedule } from "./schedule";
import { createClock, localToEpoch, parseLocalDateTime } from "./time";
import type { PhaseKey } from "./types";

/** Run a simulated clock and sample mode + next waktu once per simulated second. */
function runSim(day: 16 | 17, sim: string, speed: number, simMinutes: number) {
  let real = localToEpoch(2026, 1, 1, 9, 0, 0); // device clock is irrelevant under sim
  const clock = createClock(() => real);
  clock.setDebugTime({ simStartMs: parseLocalDateTime(sim)!, speed });
  const input = scheduleInput(day);
  const seen: { mode: string; next: string; remainingSec?: number }[] = [];
  for (let i = 0; i <= simMinutes * 60; i++) {
    const t = clock.nowMs();
    const s = computeSchedule(input, t);
    const m = computeMode(input.today.times, s.isFriday, CONFIG, t);
    if (seen.at(-1)?.mode !== m.mode) seen.push({ mode: m.mode, next: s.next.key, remainingSec: m.remainingSec });
    real += 1000 / speed; // one simulated second
  }
  return seen;
}

describe("PRD 12.1: weekday Zohor sequence", () => {
  it("PRE_AZAN, then AZAN, IQAMAH from the configured minutes, SOLAT, NORMAL with Asar next", () => {
    const seen = runSim(17, "2026-10-17T12:57:00", 10, 40);
    expect(seen.map((x) => x.mode)).toEqual(["pre_azan", "azan", "iqamah", "solat", "normal"]);
    expect(seen.find((x) => x.mode === "iqamah")!.remainingSec).toBe(CONFIG.iqamahMin.zohor * 60);
    expect(seen.at(-1)!.next).toBe("asar");
  });
});

describe("PRD 12.2: Friday", () => {
  it("AZAN, then KHUTBAH (no iqamah), SOLAT, NORMAL", () => {
    const seen = runSim(16, "2026-10-16T12:58:00", 20, 70);
    expect(seen.map((x) => x.mode)).toEqual(["pre_azan", "azan", "khutbah", "solat", "normal"]);
    expect(seen.find((x) => x.mode === "khutbah")!.remainingSec).toBe(CONFIG.durations.khutbahMin * 60);
  });
});

describe("PRD 12.3: between Syuruk and Zohor", () => {
  it("no current (no Sekarang highlight) and Zohor is next, the whole way through", () => {
    const input = scheduleInput(17);
    const { syuruk, zohor } = input.today.times;
    for (let t = syuruk; t < zohor; t += 60_000) {
      const s = computeSchedule(input, t);
      expect(s.current).toBeUndefined();
      expect(s.waktu.some((w) => w.state === "current")).toBe(false);
      expect(s.next.key).toBe("zohor");
    }
  });
});

describe("PRD 12.6: phase palette changes at the PRD 4 boundaries", () => {
  it("one phase per range, switching exactly on the boundary second", () => {
    const input = scheduleInput(17);
    const t = dayTimes(17).times;
    const dayStart = parseLocalDateTime("2026-10-17T00:00:00")!;
    const dayEnd = parseLocalDateTime("2026-10-17T23:59:59")!;
    const changes: { phase: PhaseKey; at: number }[] = [];
    for (let at = dayStart; at <= dayEnd; at += 1000) {
      const phase = computeSchedule(input, at).phase;
      if (changes.at(-1)?.phase !== phase) changes.push({ phase, at });
    }
    expect(changes).toEqual([
      { phase: "isyak", at: dayStart },
      { phase: "subuh", at: t.imsak },
      { phase: "zohor", at: t.syuruk },
      { phase: "asar", at: t.asar },
      { phase: "maghrib", at: t.maghrib },
      { phase: "isyak", at: t.isyak },
    ]);
  });
});
