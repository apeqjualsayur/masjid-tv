import { describe, expect, it } from "vitest";
import { ISLAMIC_EVENT_KEYS } from "@/core";
import {
  datedNextYear, draftChanged, hijriDayOf, nextEvents, rowsToEvents, suggestYear, takwimPayload, takwimYears, upcomingYear, validateKebesaranEvents, validateTakwim, yearGrid, type TakwimRow,
} from "./takwim";

// TEST DATES ONLY
const row = (event_key: TakwimRow["event_key"], hijri_year: number, greg_date: string, status: TakwimRow["status"] = "rasmi"): TakwimRow => ({ id: `${event_key}-${hijri_year}`, event_key, hijri_year, greg_date, status, note: null });
const ROWS: TakwimRow[] = [
  row("awal_ramadan", 1448, "2027-02-08", "jangkaan"),
  row("aidilfitri", 1448, "2027-03-10", "jangkaan"),
  row("nisfu_syaaban", 1448, "2027-01-24"),
  row("awal_muharram", 1449, "2027-06-06"),
  row("israk_mikraj", 1448, "2026-01-16"), // past
];

describe("years and the grid", () => {
  it("years newest first", () => {
    expect(takwimYears(ROWS)).toEqual([1449, 1448]);
  });
  it("one row per event per year, in calendar order, saved ones filled in", () => {
    const g = yearGrid(ROWS, 1448);
    expect(g.map((d) => d.event_key)).toEqual([...ISLAMIC_EVENT_KEYS]);
    expect(new Set(g.map((d) => d.event_key)).size).toBe(9);
    expect(g.find((d) => d.event_key === "awal_ramadan")).toEqual({ id: "awal_ramadan-1448", event_key: "awal_ramadan", hijri_year: 1448, greg_date: "2027-02-08", status: "jangkaan", note: "" });
    expect(g.find((d) => d.event_key === "aidiladha")).toEqual({ id: null, event_key: "aidiladha", hijri_year: 1448, greg_date: "", status: "jangkaan", note: "" });
    expect(yearGrid(ROWS, 1450).every((d) => d.id === null)).toBe(true);
  });
  it("a year is suggested after the newest, or today's Hijri year", () => {
    expect(suggestYear([1449, 1448], 1448)).toBe(1450);
    expect(suggestYear([], 1448)).toBe(1448);
    expect(suggestYear([], null)).toBe(1448);
  });
});

describe("saving a row", () => {
  const d = yearGrid(ROWS, 1448).find((x) => x.event_key === "aidiladha")!;
  it("a date is required to save; it must be a real date", () => {
    expect(validateTakwim(d)).toEqual({ greg_date: "required" });
    expect(validateTakwim({ ...d, greg_date: "2027-02-30" })).toEqual({ greg_date: "invalid" });
    expect(validateTakwim({ ...d, greg_date: "2027-05-17" })).toEqual({});
  });
  it("note ≤ 120 characters; year 1440–1600", () => {
    expect(validateTakwim({ ...d, greg_date: "2027-05-17", note: "a".repeat(121) })).toEqual({ note: "tooLong" });
    expect(validateTakwim({ ...d, greg_date: "2027-05-17", hijri_year: 1439 })).toEqual({ hijri_year: "invalid" });
  });
  it("payload: trimmed note, empty → null", () => {
    expect(takwimPayload({ ...d, greg_date: "2027-05-17", note: "  " })).toEqual({ event_key: "aidiladha", hijri_year: 1448, greg_date: "2027-05-17", status: "jangkaan", note: null });
    expect(takwimPayload({ ...d, greg_date: "2027-05-17", note: " JAKIM " }).note).toBe("JAKIM");
  });
  it("changed only when date, status or note differ", () => {
    expect(draftChanged(d, d)).toBe(false);
    expect(draftChanged({ ...d, note: " " }, d)).toBe(false);
    expect(draftChanged({ ...d, status: "rasmi" }, d)).toBe(true);
  });
});

describe("overview", () => {
  it("the next 3 events from today", () => {
    expect(nextEvents(ROWS, "2026-11-20").map((r) => r.event_key)).toEqual(["nisfu_syaaban", "awal_ramadan", "aidilfitri"]);
  });
  it("warns when fewer than 9 events are dated in the next 365 days", () => {
    expect(datedNextYear(ROWS, "2026-11-20")).toBe(4);
    expect(datedNextYear(ROWS, "2027-07-01")).toBe(0);
  });
  it("the editor's list: next 12 months, in date order; TV events from rows", () => {
    expect(upcomingYear(ROWS, "2026-11-20").map((r) => r.greg_date)).toEqual(["2027-01-24", "2027-02-08", "2027-03-10", "2027-06-06"]);
    expect(rowsToEvents([ROWS[0]])).toEqual([{ key: "awal_ramadan", hijriYear: 1448, date: "2027-02-08", status: "jangkaan" }]);
    expect(hijriDayOf("awal_ramadan")).toBe("1 Ramadan");
  });
  it("Hari Kebesaran slide: an empty event list is not allowed; missing = all", () => {
    expect(validateKebesaranEvents({ events: [] })).toEqual({ events: { code: "required" } });
    expect(validateKebesaranEvents({})).toEqual({});
    expect(validateKebesaranEvents({ events: ["aidilfitri"] })).toEqual({});
  });
});
