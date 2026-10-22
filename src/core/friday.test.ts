import { describe, expect, it } from "vitest";
import { CONFIG, dayTimes, scheduleInput } from "./__fixtures__/sgr01-2026-10";
import { buildDisplayState, type DisplayInputs } from "./display-state";
import { fridayInfo, jumaatEndsAt } from "./friday";
import { computeMode, prayerWindows, withDurationDefaults, type ModeDurations } from "./modes";
import { parseLocalDateTime } from "./time";

// Friday 16 Oct 2026: Zohor 13:02 (SGR01). Thursday 15 Oct: Zohor 13:02.
const fri = dayTimes(16);
const thu = dayTimes(15);
const at = (s: string) => parseLocalDateTime(s)!;
const D: ModeDurations = CONFIG.durations;
const MIN = 60_000;

describe("fridayInfo (PRD §5.1)", () => {
  it("present from 00:00 on Friday, with the estimates of the PRD table", () => {
    expect(fridayInfo(fri, D, at("2026-10-16T00:00:00"), false)).toEqual({
      azan: "1:02",
      khutbahStart: "1:05",
      khutbahMin: 40,
      solatStart: "1:45",
      solatEnd: "1:57",
      khutbahEnd: new Date(at("2026-10-16T13:45:00")),
    });
  });

  it("still present just before Solat Jumaat ends; gone 1 minute after", () => {
    expect(jumaatEndsAt(fri, D)).toBe(at("2026-10-16T13:57:00"));
    expect(fridayInfo(fri, D, at("2026-10-16T13:56:59"), false)).toBeDefined();
    expect(fridayInfo(fri, D, at("2026-10-16T13:57:00"), false)).toBeUndefined();
    expect(fridayInfo(fri, D, at("2026-10-16T13:58:00"), false)).toBeUndefined();
    expect(fridayInfo(fri, D, at("2026-10-16T21:00:00"), false)).toBeUndefined();
  });

  it("absent on Thursday, and when showFridayInfo is false", () => {
    expect(fridayInfo(thu, D, at("2026-10-15T09:00:00"), false)).toBeUndefined();
    expect(fridayInfo(fri, { ...D, showFridayInfo: false }, at("2026-10-16T09:00:00"), false)).toBeUndefined();
  });

  it("debug day=fri forces it on another day", () => {
    expect(fridayInfo(thu, D, at("2026-10-15T09:00:00"), false, true)?.azan).toBe("1:02");
  });

  it("custom khutbah 30 / Solat Jumaat 15 gives the right estimates", () => {
    expect(fridayInfo(fri, { ...D, khutbahMin: 30, jumaatSolatMin: 15 }, at("2026-10-16T08:00:00"), false)).toMatchObject({
      azan: "1:02", khutbahStart: "1:05", khutbahMin: 30, solatStart: "1:35", solatEnd: "1:50",
    });
    expect(jumaatEndsAt(fri, { ...D, khutbahMin: 30, jumaatSolatMin: 15 })).toBe(at("2026-10-16T13:50:00"));
  });

  it("24-hour clock uses the prayer list formatter", () => {
    expect(fridayInfo(fri, D, at("2026-10-16T08:00:00"), true)).toMatchObject({ azan: "13:02", khutbahStart: "13:05", solatStart: "13:45", solatEnd: "13:57" });
  });

  it("an old config without the Friday keys still works (defaults: Solat Jumaat 12, strip on)", () => {
    const old = { preAzanMin: 5, azanMin: 3, solatMin: 12, khutbahMin: 40 } as Partial<ModeDurations>;
    expect(withDurationDefaults(old)).toEqual({ preAzanMin: 5, azanMin: 3, solatMin: 12, khutbahMin: 40, jumaatSolatMin: 12, showFridayInfo: true });
    expect(fridayInfo(fri, old, at("2026-10-16T08:00:00"), false)?.solatEnd).toBe("1:57");
  });
});

describe("SOLAT length: jumaatSolatMin on Friday Zohor, solatMin otherwise", () => {
  const cfg = { ...CONFIG, durations: { ...D, solatMin: 10, jumaatSolatMin: 20 } };
  it("Friday Zohor: azan → khutbah → solat for jumaatSolatMin", () => {
    const w = prayerWindows("zohor", fri.times.zohor, true, cfg);
    expect(w.map((x) => [x.mode, (x.endMs - x.startMs) / MIN])).toEqual([["pre_azan", 5], ["azan", 3], ["khutbah", 40], ["solat", 20]]);
    expect(computeMode(fri.times, true, cfg, at("2026-10-16T14:04:59")).mode).toBe("solat");
    expect(computeMode(fri.times, true, cfg, at("2026-10-16T14:05:00")).mode).toBe("normal");
  });
  it("other days and other prayers use solatMin", () => {
    expect(prayerWindows("zohor", thu.times.zohor, false, cfg).at(-1)).toMatchObject({ mode: "solat" });
    expect((prayerWindows("zohor", thu.times.zohor, false, cfg).at(-1)!.endMs - prayerWindows("zohor", thu.times.zohor, false, cfg).at(-1)!.startMs) / MIN).toBe(10);
    const asr = prayerWindows("asar", fri.times.asar, true, cfg).at(-1)!;
    expect((asr.endMs - asr.startMs) / MIN).toBe(10);
  });
  it("khutbah progress and remaining seconds", () => {
    expect(computeMode(fri.times, true, cfg, at("2026-10-16T13:05:00"))).toMatchObject({ mode: "khutbah", remainingSec: 2400, progress: 0 });
    expect(computeMode(fri.times, true, cfg, at("2026-10-16T13:25:00"))).toMatchObject({ mode: "khutbah", remainingSec: 1200, progress: 0.5 });
    expect(computeMode(fri.times, true, cfg, at("2026-10-16T13:44:59"))).toMatchObject({ mode: "khutbah", remainingSec: 1 });
  });
});

describe("DisplayState on Friday", () => {
  const input = (t: string, over: Partial<DisplayInputs> = {}): DisplayInputs => {
    const s = scheduleInput(16);
    return {
      at: at(t), today: s.today, tomorrowImsak: s.tomorrowImsak, tomorrowSubuh: s.tomorrowSubuh,
      clock24h: false, showArabic: true, ticker: [], lite: false,
      masjid: { fullName: "Masjid", shortName: "M" }, modeConfig: CONFIG, ...over,
    };
  };
  it("carries the strip; none on Thursday", () => {
    expect(buildDisplayState(input("2026-10-16T09:00:00")).friday?.solatStart).toBe("1:45");
    const s = scheduleInput(15);
    expect(buildDisplayState({ ...input("2026-10-15T09:00:00"), today: s.today, tomorrowImsak: s.tomorrowImsak, tomorrowSubuh: s.tomorrowSubuh }).friday).toBeUndefined();
  });
  it("PRE_AZAN banner on Friday reads \"Azan Jumaat dalam N minit\"; other days keep the prayer name", () => {
    const st = buildDisplayState(input("2026-10-16T12:58:00"));
    expect(st.mode).toBe("pre_azan");
    expect(st.modeTarget?.label).toBe("Azan Jumaat");
    expect(st.waktu.find((w) => w.key === "zohor")?.label).toBe("Jumaat"); // the prayer list is unchanged
    const asar = buildDisplayState(input("2026-10-16T16:15:00"));
    expect(asar.mode).toBe("pre_azan");
    expect(asar.modeTarget?.label).toBe("Asar");
  });
  it("khutbah screen data: remaining and progress, strip still available for 'Dijangka tamat'", () => {
    const st = buildDisplayState(input("2026-10-16T13:25:00"));
    expect(st).toMatchObject({ mode: "khutbah", modeRemainingSec: 1200, modeProgress: 0.5 });
    expect(st.friday?.solatStart).toBe("1:45");
  });
});