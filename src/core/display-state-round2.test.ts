// PRD themes round 2: WaktuView.iqamah (D5) and the `poster` layout ignoring prayer modes (D2, D3).
import { describe, expect, it } from "vitest";
import { CONFIG, dayTimes } from "./__fixtures__/sgr01-2026-10";
import { buildDisplayState, type DisplayInputs } from "./display-state";
import { parseLocalDateTime } from "./time";

const at = (s: string) => parseLocalDateTime(s)!;
const base = (day: 16 | 17, when: string, extra: Partial<DisplayInputs> = {}): DisplayInputs => ({
  at: at(when),
  today: dayTimes(day),
  tomorrowImsak: dayTimes((day + 1) as 17 | 18).times.imsak,
  tomorrowSubuh: dayTimes((day + 1) as 17 | 18).times.subuh,
  clock24h: false,
  showArabic: true,
  ticker: [],
  lite: false,
  masjid: { fullName: "Nama Masjid", shortName: "NM" },
  modeConfig: CONFIG, // iqamahMin: subuh 10, zohor 10, asar 10, maghrib 7, isyak 10
  ...extra,
});
const iqamah = (inp: DisplayInputs) => Object.fromEntries(buildDisplayState(inp).waktu.map((w) => [w.key, w.iqamah]));

describe("WaktuView.iqamah (azan + iqamahMin)", () => {
  it("every prayer gets azan + its own minutes; markers get none (Sat 17 Oct)", () => {
    expect(iqamah(base(17, "2026-10-17T10:00:00"))).toEqual({
      imsak: undefined, subuh: "6:00", syuruk: undefined, zohor: "1:11", asar: "4:28", maghrib: "7:08", isyak: "8:21",
    });
  });

  it("Friday Zohor (Jumaat) has no iqamah; the other prayers do", () => {
    const fri = iqamah(base(16, "2026-10-16T10:00:00"));
    expect(fri.zohor).toBeUndefined();
    expect(fri.subuh).toBe("6:00");
    expect(fri.asar).toBe("4:28");
    expect(buildDisplayState(base(16, "2026-10-16T10:00:00")).waktu[3].label).toBe("Jumaat");
  });

  it("follows the masjid's iqamahMin when it changes", () => {
    const changed = { ...CONFIG, iqamahMin: { ...CONFIG.iqamahMin, maghrib: 15, subuh: 20 } };
    const r = iqamah(base(17, "2026-10-17T10:00:00", { modeConfig: changed }));
    expect(r.maghrib).toBe("7:16");
    expect(r.subuh).toBe("6:10");
    expect(r.zohor).toBe("1:11");
  });

  it("is formatted like `time`, including the 24-hour clock", () => {
    const r = iqamah(base(17, "2026-10-17T10:00:00", { clock24h: true }));
    expect(r).toMatchObject({ subuh: "06:00", zohor: "13:11", isyak: "20:21" });
    const s = buildDisplayState(base(17, "2026-10-17T10:00:00", { clock24h: true }));
    expect(s.waktu[3].time).toBe("13:01");
  });

  it("current and next carry their iqamah too", () => {
    const s = buildDisplayState(base(17, "2026-10-17T14:00:00"));
    expect(s.current?.iqamah).toBe("1:11");
    expect(s.next.iqamah).toBe("4:28");
  });
});

describe("layout 'poster' never switches to a prayer mode", () => {
  const cases: [string, 16 | 17, string, string][] = [
    ["pre_azan", 17, "2026-10-17T12:58:00", "pre_azan"],
    ["azan", 17, "2026-10-17T13:02:00", "azan"],
    ["iqamah", 17, "2026-10-17T13:09:00", "iqamah"],
    ["solat", 17, "2026-10-17T13:20:36", "solat"],
    ["khutbah (Friday)", 16, "2026-10-16T13:10:00", "khutbah"],
  ];
  it.each(cases)("%s time: other layouts switch, poster stays normal", (_name, day, when, mode) => {
    expect(buildDisplayState(base(day, when)).mode).toBe(mode);
    const p = buildDisplayState(base(day, when, { layout: "poster" }));
    expect(p.mode).toBe("normal");
    expect(p.modeTarget).toBeUndefined();
    expect(p.modeRemainingSec).toBeUndefined();
    expect(p.modeProgress).toBeUndefined();
  });

  it("still computes the phase (for theme colours) and the rest of the state", () => {
    const p = buildDisplayState(base(17, "2026-10-17T13:09:00", { layout: "poster" }));
    expect(p.phase).toBe("zohor");
    expect(p.current?.key).toBe("zohor");
    expect(buildDisplayState(base(17, "2026-10-17T21:00:00", { layout: "poster" })).phase).toBe("isyak");
  });

  it("ignores a forced debug mode (?mode=azan) too", () => {
    const forced = { mode: "azan" as const, target: "zohor" as const, sinceMs: at("2026-10-17T10:00:00") };
    expect(buildDisplayState(base(17, "2026-10-17T10:00:30", { forced })).mode).toBe("azan");
    expect(buildDisplayState(base(17, "2026-10-17T10:00:30", { forced, layout: "poster" })).mode).toBe("normal");
  });

  it("full / bottom / side keep their modes", () => {
    for (const layout of ["full", "bottom", "side"] as const) {
      expect(buildDisplayState(base(17, "2026-10-17T13:02:00", { layout })).mode).toBe("azan");
    }
  });
});
