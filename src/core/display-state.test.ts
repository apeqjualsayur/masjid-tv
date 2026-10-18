import { describe, expect, it } from "vitest";
import { CONFIG, dayTimes, scheduleInput } from "./__fixtures__/sgr01-2026-10";
import { buildDisplayState, upcomingPrayer, type DisplayInputs } from "./display-state";
import { computeSchedule } from "./schedule";
import { parseLocalDateTime } from "./time";

const at = (s: string) => parseLocalDateTime(s)!;
const base = (day: 16 | 17, when: string, extra: Partial<DisplayInputs> = {}): DisplayInputs => ({
  at: at(when),
  today: dayTimes(day),
  tomorrowImsak: dayTimes((day + 1) as 17 | 18).times.imsak,
  tomorrowSubuh: dayTimes((day + 1) as 17 | 18).times.subuh,
  clock24h: false,
  showArabic: true,
  ticker: ["[Teks pengumuman]"],
  lite: false,
  masjid: { fullName: "Nama Masjid / Surau", shortName: "NM", logoUrl: "/config/logo.png" },
  modeConfig: CONFIG,
  ...extra,
});

describe("buildDisplayState", () => {
  it("matches the contract example shape at 13:20:36 on Sat 17 Oct 2026", () => {
    const s = buildDisplayState(base(17, "2026-10-17T13:20:36"));
    expect(s.clock).toBe("1:20");
    expect(s.seconds).toBe("36");
    expect(s.gregorian).toBe("Sabtu, 17 Oktober 2026");
    expect(s.hijri).toBe("6 Jamadilawal 1448H");
    expect(s.phase).toBe("zohor");
    expect(s.waktu).toHaveLength(7);
    expect(s.waktu.map((w) => w.time)).toEqual(["5:40", "5:50", "6:56", "1:01", "4:18", "7:01", "8:11"]);
    expect(s.current).toMatchObject({ key: "zohor", label: "Zohor", arabic: "ظهر", state: "current", isMarker: false });
    expect(s.next).toMatchObject({ key: "asar", state: "next" });
    expect(s.countdownText).toBe("2 jam 58 minit");
    expect(s.mode).toBe("solat");
    expect(s.modeTarget?.key).toBe("zohor");
    expect(s.isFriday).toBe(false);
    expect(s.masjid.shortName).toBe("NM");
    expect(s.now.getTime()).toBe(at("2026-10-17T13:20:36"));
  });

  it("24-hour clock and times", () => {
    const s = buildDisplayState(base(17, "2026-10-17T13:20:36", { clock24h: true }));
    expect(s.clock).toBe("13:20");
    expect(s.waktu[3].time).toBe("13:01");
  });

  it("iqamah: target, remaining seconds and progress", () => {
    const s = buildDisplayState(base(17, "2026-10-17T13:09:00"));
    expect(s).toMatchObject({ mode: "iqamah", modeRemainingSec: 300, modeProgress: 0.5 });
    expect(s.modeTarget?.label).toBe("Zohor");
  });

  it("Friday: Jumaat label and khutbah", () => {
    const s = buildDisplayState(base(16, "2026-10-16T13:10:00"));
    expect(s.isFriday).toBe(true);
    expect(s.mode).toBe("khutbah");
    expect(s.modeTarget?.label).toBe("Jumaat");
  });

  it("day=fri forces Friday on a Saturday", () => {
    const s = buildDisplayState(base(17, "2026-10-17T13:10:00", { forceFriday: true }));
    expect(s).toMatchObject({ isFriday: true, mode: "khutbah" });
  });

  it("unknown tomorrow after Isyak: next Subuh shows a dash, no countdown, nothing guessed", () => {
    const s = buildDisplayState(base(17, "2026-10-17T22:00:00", { tomorrowImsak: null, tomorrowSubuh: null }));
    expect(s.next).toMatchObject({ key: "subuh", time: "–" });
    expect(s.waktu[0]).toMatchObject({ key: "imsak", time: "–", state: "upcoming" });
    expect(s.countdownText).toBe("");
    expect(s.current?.key).toBe("isyak");
  });

  it("forced mode counts down from when it was forced", () => {
    const since = at("2026-10-17T10:00:00");
    const s = buildDisplayState(base(17, "2026-10-17T10:03:00", { forced: { mode: "iqamah", target: "zohor", sinceMs: since } }));
    expect(s).toMatchObject({ mode: "iqamah", modeRemainingSec: 420 });
    expect(s.modeTarget?.key).toBe("zohor");
  });
});

describe("upcomingPrayer", () => {
  it("is the next prayer, never a marker", () => {
    expect(upcomingPrayer(computeSchedule(scheduleInput(17), at("2026-10-17T03:00:00")))).toBe("subuh"); // before Imsak
    expect(upcomingPrayer(computeSchedule(scheduleInput(17), at("2026-10-17T06:30:00")))).toBe("zohor"); // before Syuruk
    expect(upcomingPrayer(computeSchedule(scheduleInput(17), at("2026-10-17T14:00:00")))).toBe("asar");
  });
});