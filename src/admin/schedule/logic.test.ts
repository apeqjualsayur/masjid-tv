import { describe, expect, it } from "vitest";
import { localToEpoch } from "@/core";
import { defaultSchedule, scheduleFromRow, scheduleToRow, toEpoch, validateSchedule, type Schedule } from "./logic";

const NOW = localToEpoch(2026, 10, 22, 21, 7); // Khamis 22 Okt 2026, 9:07 malam MYT

describe("Malaysia time ↔ timestamptz", () => {
  it("date + time are Malaysia time", () => {
    expect(new Date(toEpoch("2026-10-22", "08:00")!).toISOString()).toBe("2026-10-22T00:00:00.000Z");
    expect(toEpoch("2026-02-31", "08:00")).toBeNull();
    expect(toEpoch("2026-10-22", "24:00")).toBeNull();
    expect(toEpoch("22/10/2026", "08:00")).toBeNull();
  });
  it("default: starts now, no end, 15 s, every day, all screens", () => {
    expect(defaultSchedule(NOW)).toEqual({ startDate: "2026-10-22", startTime: "21:07", hasEnd: false, endDate: "2026-10-25", endTime: "23:59", durationS: 15, days: [], priority: false, screenIds: null });
    expect(defaultSchedule(NOW, { endRequired: true }).hasEnd).toBe(true);
  });
  it("row round trip", () => {
    const s: Schedule = { ...defaultSchedule(NOW), hasEnd: true, endDate: "2026-10-29", endTime: "22:00", durationS: 20, days: [5, 1, 1], priority: true, screenIds: ["a"] };
    const row = scheduleToRow(s);
    expect(row).toEqual({ starts_at: "2026-10-22T13:07:00.000Z", ends_at: "2026-10-29T14:00:00.000Z", duration_s: 20, days_of_week: [1, 5], priority: true, screen_ids: ["a"] });
    expect(scheduleFromRow(row, 0)).toEqual({ ...s, days: [1, 5] });
  });
  it("every weekday or none = every day; no screens list = all screens", () => {
    expect(scheduleToRow({ ...defaultSchedule(NOW), days: [1, 2, 3, 4, 5, 6, 7] }).days_of_week).toBeNull();
    expect(scheduleToRow({ ...defaultSchedule(NOW), days: [] }).days_of_week).toBeNull();
    expect(scheduleToRow(defaultSchedule(NOW)).screen_ids).toBeNull();
    expect(scheduleFromRow({ starts_at: "2026-10-22T00:00:00+00:00", ends_at: null, duration_s: 15, days_of_week: null, priority: false, screen_ids: null }, 0)).toMatchObject({ startDate: "2026-10-22", startTime: "08:00", hasEnd: false, days: [] });
  });
});

describe("validateSchedule", () => {
  const ok = defaultSchedule(NOW);
  it("a default schedule is valid", () => expect(validateSchedule(ok)).toEqual({}));
  it("end must be after start", () => {
    expect(validateSchedule({ ...ok, hasEnd: true, endDate: "2026-10-22", endTime: "21:00" }).end).toBe("schedule.err.endBeforeStart");
    expect(validateSchedule({ ...ok, hasEnd: true, endDate: "2026-13-01" }).end).toBe("schedule.err.end");
  });
  it("duration 5 to 120 seconds", () => {
    expect(validateSchedule({ ...ok, durationS: 4 }).duration).toBe("schedule.err.duration");
    expect(validateSchedule({ ...ok, durationS: 121 }).duration).toBe("schedule.err.duration");
    expect(validateSchedule({ ...ok, durationS: 120 }).duration).toBeUndefined();
  });
  it("selected screens cannot be empty", () => {
    expect(validateSchedule({ ...ok, screenIds: [] }).screens).toBe("schedule.err.screens");
  });
  it("Kematian rules: end required, at most 7 days", () => {
    const rules = { endRequired: true, maxDays: 7 };
    expect(validateSchedule({ ...ok, hasEnd: false }, rules).end).toBe("schedule.err.endRequired");
    expect(validateSchedule({ ...ok, hasEnd: true, endDate: "2026-10-29", endTime: "21:07" }, rules)).toEqual({});
    expect(validateSchedule({ ...ok, hasEnd: true, endDate: "2026-10-29", endTime: "21:08" }, rules).end).toBe("schedule.err.endTooLate");
  });
});
describe("shiftSchedule", () => {
  it("moves start and end by whole days", async () => {
    const { shiftSchedule } = await import("./logic");
    const s = { ...defaultSchedule(NOW), hasEnd: true, endDate: "2026-10-29", endTime: "22:00" };
    expect(shiftSchedule(s, 7)).toMatchObject({ startDate: "2026-10-29", startTime: "21:07", endDate: "2026-11-05", endTime: "22:00" });
    expect(shiftSchedule({ ...s, startDate: "2026-12-30" }, 7).startDate).toBe("2027-01-06");
  });
});
