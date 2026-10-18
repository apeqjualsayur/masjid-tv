import { describe, expect, it } from "vitest";
import { dayTimes, scheduleInput } from "./__fixtures__/sgr01-2026-10";
import { computeSchedule, phaseAt } from "./schedule";
import { parseLocalDateTime } from "./time";

// Saturday 17 Oct 2026, SGR01:
// imsak 5:40, subuh 5:50, syuruk 6:56, zohor 13:01, asar 16:18, maghrib 19:01, isyak 20:11
const at = (s: string) => parseLocalDateTime(`2026-10-17T${s}`)!;
const sat = scheduleInput(17);
const states = (s: ReturnType<typeof computeSchedule>) => Object.fromEntries(s.waktu.map((w) => [w.key, w.state]));

describe("waktu list", () => {
  it("always has 7 entries in order with markers flagged", () => {
    const s = computeSchedule(sat, at("10:00:00"));
    expect(s.waktu.map((w) => w.key)).toEqual(["imsak", "subuh", "syuruk", "zohor", "asar", "maghrib", "isyak"]);
    expect(s.waktu.filter((w) => w.isMarker).map((w) => w.key)).toEqual(["imsak", "syuruk"]);
    expect(s.waktu.map((w) => w.arabic)).toEqual(["إمساك", "صبح", "شروق", "ظهر", "عصر", "مغرب", "عشاء"]);
  });
});

describe("current and next", () => {
  it("mid-afternoon: current Zohor, next Asar, earlier ones past", () => {
    const s = computeSchedule(sat, at("14:00:00"));
    expect(s.current?.key).toBe("zohor");
    expect(s.next.key).toBe("asar");
    expect(states(s)).toEqual({
      imsak: "past", subuh: "past", syuruk: "past", zohor: "current", asar: "next", maghrib: "upcoming", isyak: "upcoming",
    });
  });

  it("between Imsak and Subuh: current is last night's Isyak, next Subuh", () => {
    const s = computeSchedule(sat, at("05:45:00"));
    expect(s.current?.key).toBe("isyak");
    expect(s.next.key).toBe("subuh");
    expect(s.phase).toBe("subuh");
  });

  it("Subuh to Syuruk: current Subuh, next is the Syuruk marker", () => {
    const s = computeSchedule(sat, at("06:30:00"));
    expect(s.current?.key).toBe("subuh");
    expect(s.next.key).toBe("syuruk");
    expect(s.countdownText).toBe("26 minit");
  });

  it("markers never become current", () => {
    for (const t of ["05:40:00", "05:49:59", "06:56:00", "07:00:00", "12:00:00"]) {
      const s = computeSchedule(sat, at(t));
      expect(s.current?.isMarker ?? false).toBe(false);
    }
  });
});

describe("edge cases", () => {
  it("just after midnight: current Isyak (previous night), next today's Imsak", () => {
    const s = computeSchedule(sat, at("00:00:30"));
    expect(s.phase).toBe("isyak");
    expect(s.current?.key).toBe("isyak");
    expect(s.next.key).toBe("imsak");
    expect(s.nextIsTomorrow).toBe(false);
    expect(s.next.time).toBe(dayTimes(17).times.imsak);
    expect(s.countdownText).toBe("5 jam 40 minit");
    expect(s.waktu.filter((w) => w.state === "past")).toHaveLength(0);
  });

  it("exactly at a boundary second the waktu has started", () => {
    const before = computeSchedule(sat, at("13:00:59"));
    expect(before.current).toBeUndefined(); // still between Syuruk and Zohor
    expect(before.next.key).toBe("zohor");
    expect(before.countdownText).toBe("1 minit");

    const onTheSecond = computeSchedule(sat, at("13:01:00"));
    expect(onTheSecond.current?.key).toBe("zohor");
    expect(onTheSecond.next.key).toBe("asar");
    expect(onTheSecond.phase).toBe("zohor");
  });

  it("Isyak to Imsak wrap: next is tomorrow's Imsak", () => {
    const s = computeSchedule(sat, at("22:00:00"));
    expect(s.current?.key).toBe("isyak");
    expect(s.next.key).toBe("imsak");
    expect(s.nextIsTomorrow).toBe(true);
    expect(s.next.time).toBe(dayTimes(18).times.imsak);
    expect(s.countdownText).toBe("7 jam 40 minit");
    expect(states(s)).toEqual({
      imsak: "next", subuh: "past", syuruk: "past", zohor: "past", asar: "past", maghrib: "past", isyak: "current",
    });
  });

  it("exactly at Isyak the wrap begins", () => {
    const s = computeSchedule(sat, at("20:11:00"));
    expect(s.current?.key).toBe("isyak");
    expect(s.nextIsTomorrow).toBe(true);
  });

  it("last second of the day", () => {
    const s = computeSchedule(sat, at("23:59:59"));
    expect(s.phase).toBe("isyak");
    expect(s.next.key).toBe("imsak");
    expect(s.countdownText).toBe("5 jam 41 minit");
  });
});

describe("countdown text", () => {
  it("2 jam 51 minit and 49 minit, as in the designs", () => {
    expect(computeSchedule(sat, at("13:27:00")).countdownText).toBe("2 jam 51 minit");
    expect(computeSchedule(sat, at("15:29:00")).countdownText).toBe("49 minit");
  });
});

describe("Friday", () => {
  it("Zohor is labelled Jumaat on Friday", () => {
    const s = computeSchedule(scheduleInput(16), parseLocalDateTime("2026-10-16T12:00:00")!);
    expect(s.isFriday).toBe(true);
    const zohor = s.waktu.find((w) => w.key === "zohor")!;
    expect(zohor.label).toBe("Jumaat");
    expect(zohor.arabic).toBe("جمعة");
  });

  it("Zohor keeps its name on other days", () => {
    const s = computeSchedule(sat, at("12:00:00"));
    expect(s.isFriday).toBe(false);
    expect(s.waktu.find((w) => w.key === "zohor")!.label).toBe("Zohor");
    expect(computeSchedule(scheduleInput(15), parseLocalDateTime("2026-10-15T12:00:00")!).isFriday).toBe(false);
  });

  it("day=fri debug override forces Friday behaviour", () => {
    const s = computeSchedule(scheduleInput(17, true), at("12:00:00"));
    expect(s.isFriday).toBe(true);
    expect(s.next.label).toBe("Jumaat");
  });
});

describe("phaseAt", () => {
  it("uses the waktu start as the inclusive boundary", () => {
    const t = dayTimes(17).times;
    expect(phaseAt(t, t.imsak - 1)).toBe("isyak");
    expect(phaseAt(t, t.imsak)).toBe("subuh");
    expect(phaseAt(t, t.subuh)).toBe("subuh");
    expect(phaseAt(t, t.zohor - 1)).toBe("zohor");
  });
});
