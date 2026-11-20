import { describe, expect, it } from "vitest";
import {
  activityCountdown, activityEventAt, activityNotice, daysBetween, isDateKey, slideActivityCountdown, type ActivityNotice,
} from "./activity";
import { parseLocalDateTime } from "./time";

const at = (s: string) => parseLocalDateTime(s)!;
/** A kuliah on Saturday 28 Nov 2026 at 8:45 malam (20:45). */
const KULIAH = { topic: "Adab", date: "Sabtu, 28 November 2026", dateIso: "2026-11-28", time: "8:45 malam" };
const cd = (now: string, fields: Record<string, unknown> = KULIAH, clock24h = false) => slideActivityCountdown(fields, at(now), clock24h);

describe("helpers", () => {
  it("daysBetween counts calendar days, across months and years", () => {
    expect(daysBetween("2026-11-28", "2026-11-28")).toBe(0);
    expect(daysBetween("2026-11-28", "2026-12-01")).toBe(3);
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
    expect(daysBetween("2026-12-01", "2026-11-28")).toBe(-3);
    expect(daysBetween("x", "2026-11-28")).toBeNaN();
  });
  it("isDateKey accepts real dates only", () => {
    expect(isDateKey("2027-02-28")).toBe(true);
    expect(isDateKey("2027-02-29")).toBe(false);
    expect(isDateKey("2027-2-8")).toBe(false);
    expect(isDateKey(20270208)).toBe(false);
  });
  it("event time = dateIso + time; a prayer-relative time has no clock; no dateIso → none", () => {
    expect(activityEventAt(KULIAH)).toEqual({ dateIso: "2026-11-28", atMs: at("2026-11-28T20:45"), label: "8:45 malam" });
    expect(activityEventAt({ ...KULIAH, time: "Selepas Maghrib" })).toEqual({ dateIso: "2026-11-28", atMs: null, label: "Selepas Maghrib" });
    expect(activityEventAt({ ...KULIAH, time: undefined })).toEqual({ dateIso: "2026-11-28", atMs: null, label: "" });
    expect(activityEventAt({ date: "Sabtu, 28 November 2026", time: "8:45 malam" })).toBeNull();
    expect(activityEventAt({ dateIso: "2026-11-31" })).toBeNull();
  });
  it("reads fields.notice; newAt only for tangguh", () => {
    expect(activityNotice({ notice: { kind: "tangguh", newAt: "2026-12-05T20:45", reason: " Penceramah uzur " } })).toEqual({ kind: "tangguh", newAt: "2026-12-05T20:45", reason: "Penceramah uzur" });
    expect(activityNotice({ notice: { kind: "batal", newAt: "2026-12-05T20:45" } })).toEqual({ kind: "batal", newAt: null, reason: null });
    expect(activityNotice({ notice: { kind: "tangguh", newAt: "esok" } })).toEqual({ kind: "tangguh", newAt: null, reason: null });
    expect(activityNotice({ notice: { kind: "lewat" } })).toBeNull();
    expect(activityNotice({ notice: "batal" })).toBeNull();
    expect(activityNotice({})).toBeNull();
  });
});

describe("activity countdown states (PRD enhancements §4.2, acceptance 4)", () => {
  it("3 days before → 'Lagi 3 hari'", () => {
    expect(cd("2026-11-25T10:00")).toEqual({ kind: "days", days: 3 });
    expect(cd("2026-11-26T23:59:59")).toEqual({ kind: "days", days: 2 });
  });
  it("the day before → 'Esok · 8:45 malam' (24h: 20:45)", () => {
    expect(cd("2026-11-27T00:00")).toEqual({ kind: "tomorrow", time: "8:45 malam" });
    expect(cd("2026-11-27T21:00")).toEqual({ kind: "tomorrow", time: "8:45 malam" });
    expect(cd("2026-11-27T21:00", KULIAH, true)).toEqual({ kind: "tomorrow", time: "20:45" });
  });
  it("2 h before → 'Hari ini · 8:45 malam'", () => {
    expect(cd("2026-11-28T00:00")).toEqual({ kind: "today", time: "8:45 malam" });
    expect(cd("2026-11-28T18:45")).toEqual({ kind: "today", time: "8:45 malam" });
    expect(cd("2026-11-28T18:45", KULIAH, true)).toEqual({ kind: "today", time: "20:45" });
  });
  it("> 60 min stays 'today'; from 60:00 it counts mm:ss", () => {
    expect(cd("2026-11-28T19:44:59")).toEqual({ kind: "today", time: "8:45 malam" });
    expect(cd("2026-11-28T19:45:00")).toEqual({ kind: "minutes", mm: 60, ss: 0, text: "60:00" });
  });
  it("59:30 before → 'Bermula dalam 59:30'; 1 s before → 00:01", () => {
    expect(cd("2026-11-28T19:45:30")).toEqual({ kind: "minutes", mm: 59, ss: 30, text: "59:30" });
    expect(cd("2026-11-28T20:44:59")).toEqual({ kind: "minutes", mm: 0, ss: 1, text: "00:01" });
  });
  it("a part second rounds up, so it never shows 00:00 before the start", () => {
    expect(slideActivityCountdown(KULIAH, at("2026-11-28T20:44:59") + 500)).toMatchObject({ kind: "minutes", text: "00:01" });
  });
  it("at the start and 10 min after → 'Sedang berlangsung'", () => {
    expect(cd("2026-11-28T20:45")).toEqual({ kind: "ongoing" });
    expect(cd("2026-11-28T20:55")).toEqual({ kind: "ongoing" });
    expect(cd("2026-11-28T22:14:59")).toEqual({ kind: "ongoing" });
  });
  it("after durationMin (default 90) → hidden; 2 h after → hidden", () => {
    expect(cd("2026-11-28T22:15")).toEqual({ kind: "none" });
    expect(cd("2026-11-28T22:45")).toEqual({ kind: "none" });
    expect(cd("2026-11-29T10:00")).toEqual({ kind: "none" });
  });
  it("durationMin from the slide", () => {
    expect(cd("2026-11-28T21:14", { ...KULIAH, durationMin: 30 })).toEqual({ kind: "ongoing" });
    expect(cd("2026-11-28T21:15", { ...KULIAH, durationMin: 30 })).toEqual({ kind: "none" });
    expect(activityCountdown(activityEventAt(KULIAH), -5, at("2026-11-28T22:00"))).toEqual({ kind: "ongoing" }); // nonsense → 90
  });
  it("noon times read 'tengah hari' (12h) and 12:30 (24h)", () => {
    const noon = { ...KULIAH, time: "12:30 tengah hari" };
    expect(cd("2026-11-27T09:00", noon)).toEqual({ kind: "tomorrow", time: "12:30 tengah hari" });
    expect(cd("2026-11-27T09:00", noon, true)).toEqual({ kind: "tomorrow", time: "12:30" });
  });
});

describe("midnight", () => {
  const LATE = { ...KULIAH, dateIso: "2026-11-29", time: "12:30 pagi" }; // 00:30 on Sunday
  it("an event just after midnight counts mm:ss from 23:30 the evening before", () => {
    expect(cd("2026-11-28T23:29:59", LATE)).toEqual({ kind: "tomorrow", time: "12:30 pagi" });
    expect(cd("2026-11-28T23:45", LATE)).toEqual({ kind: "minutes", mm: 45, ss: 0, text: "45:00" });
    expect(cd("2026-11-28T23:45", LATE, true)).toMatchObject({ kind: "minutes", text: "45:00" });
  });
  it("the calendar day changes at local midnight", () => {
    const EV = { ...KULIAH, dateIso: "2026-11-30" };
    expect(cd("2026-11-28T23:59:59", EV)).toEqual({ kind: "days", days: 2 });
    expect(cd("2026-11-29T00:00:00", EV)).toEqual({ kind: "tomorrow", time: "8:45 malam" });
  });
  it("an event running past midnight stays 'Sedang berlangsung'", () => {
    const LATE_START = { ...KULIAH, time: "11:30 malam" };
    expect(cd("2026-11-29T00:10", LATE_START)).toEqual({ kind: "ongoing" });
    expect(cd("2026-11-29T01:00", LATE_START)).toEqual({ kind: "none" });
  });
});

describe("prayer-relative time (D10): day-level states only", () => {
  const MAGHRIB = { ...KULIAH, time: "Selepas Maghrib" };
  it("days / tomorrow / today with the choice text; never mm:ss or ongoing; hidden the next day", () => {
    expect(cd("2026-11-25T10:00", MAGHRIB)).toEqual({ kind: "days", days: 3 });
    expect(cd("2026-11-27T21:00", MAGHRIB)).toEqual({ kind: "tomorrow", time: "Selepas Maghrib" });
    expect(cd("2026-11-28T19:00", MAGHRIB)).toEqual({ kind: "today", time: "Selepas Maghrib" });
    expect(cd("2026-11-28T23:59", MAGHRIB, true)).toEqual({ kind: "today", time: "Selepas Maghrib" });
    expect(cd("2026-11-29T00:00", MAGHRIB)).toEqual({ kind: "none" });
  });
  it("no time at all behaves the same, with an empty time", () => {
    expect(cd("2026-11-28T10:00", { ...KULIAH, time: "" })).toEqual({ kind: "today", time: "" });
  });
});

describe("showCountdown and notices", () => {
  it("showCountdown false hides it; missing counts as on", () => {
    expect(cd("2026-11-25T10:00", { ...KULIAH, showCountdown: false })).toEqual({ kind: "none" });
    expect(cd("2026-11-25T10:00", { ...KULIAH, showCountdown: true })).toEqual({ kind: "days", days: 3 });
  });
  it("no dateIso → no countdown", () => {
    expect(cd("2026-11-25T10:00", { topic: "Adab", time: "8:45 malam" })).toEqual({ kind: "none" });
  });
  it("Tangguh with newAt counts to the new date (exact, even if the old time was prayer-relative)", () => {
    const f = { ...KULIAH, time: "Selepas Maghrib", notice: { kind: "tangguh", newAt: "2026-12-05T20:45", reason: "Penceramah uzur" } };
    expect(cd("2026-11-28T20:00", f)).toEqual({ kind: "days", days: 7 });
    expect(cd("2026-12-04T09:00", f)).toEqual({ kind: "tomorrow", time: "8:45 malam" });
    expect(cd("2026-12-05T20:15", f)).toEqual({ kind: "minutes", mm: 30, ss: 0, text: "30:00" });
    expect(cd("2026-12-05T21:00", f)).toEqual({ kind: "ongoing" });
  });
  it("Tangguh without a date and Batal → no countdown", () => {
    expect(cd("2026-11-27T21:00", { ...KULIAH, notice: { kind: "tangguh", newAt: null } })).toEqual({ kind: "none" });
    expect(cd("2026-11-28T20:15", { ...KULIAH, notice: { kind: "batal", reason: "Hujan lebat" } })).toEqual({ kind: "none" });
    const batal: ActivityNotice = { kind: "batal", newAt: "2026-12-05T20:45", reason: null };
    expect(activityCountdown(activityEventAt(KULIAH), 90, at("2026-11-28T20:15"), batal)).toEqual({ kind: "none" });
  });
});
