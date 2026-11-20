import { describe, expect, it } from "vitest";
import { hariKebesaranOptions, islamicEventsView, ISLAMIC_EVENT_KEYS, type IslamicEvent } from "./islamic-events";
import { slideIsEmpty } from "./slide-empty";
import { EMPTY_ROSTER } from "./roster";
import { parseLocalDateTime } from "./time";

// TEST DATES ONLY (not the JAKIM takwim): shaped like a real Hijri year.
const TAKWIM: IslamicEvent[] = [
  { key: "nisfu_syaaban", hijriYear: 1448, date: "2027-01-24", status: "rasmi" },
  { key: "awal_ramadan", hijriYear: 1448, date: "2027-02-08", status: "jangkaan" },
  { key: "nuzul_quran", hijriYear: 1448, date: "2027-02-24", status: "jangkaan" },
  { key: "aidilfitri", hijriYear: 1448, date: "2027-03-10", status: "jangkaan" },
  { key: "hari_arafah", hijriYear: 1448, date: "2027-05-16", status: "rasmi" },
  { key: "aidiladha", hijriYear: 1448, date: "2027-05-17", status: "rasmi" },
  { key: "awal_muharram", hijriYear: 1449, date: "2027-06-06", status: "rasmi" },
];
const at = (s: string) => parseLocalDateTime(s)!;
const view = (now: string, fields: Record<string, unknown> = {}, maghrib: string | null = null, events = TAKWIM) =>
  islamicEventsView(events, fields, at(now), maghrib ? at(maghrib) : null);

describe("slide options (§5.3)", () => {
  it("defaults: all 9 events, 60 days, 2 more", () => {
    expect(hariKebesaranOptions({})).toEqual({ events: [...ISLAMIC_EVENT_KEYS], leadDays: 60, showMore: 2 });
  });
  it("unknown keys dropped; leadDays 7–365; showMore 0–2", () => {
    expect(hariKebesaranOptions({ events: ["aidilfitri", "banana"], leadDays: 1000, showMore: 5 })).toEqual({ events: ["aidilfitri"], leadDays: 365, showMore: 2 });
    expect(hariKebesaranOptions({ events: "all", leadDays: 2, showMore: -1 })).toMatchObject({ events: [...ISLAMIC_EVENT_KEYS], leadDays: 7, showMore: 0 });
  });
});

describe("countdown (§5.4.4–5)", () => {
  it("nearest event within leadDays, with Hijri label, Gregorian date and the next ones small", () => {
    const v = view("2026-12-10T10:00");
    expect(v).toMatchObject({
      kind: "countdown",
      days: 45,
      event: { key: "nisfu_syaaban", label: "Nisfu Syaaban", hijri: "15 Syaaban 1448H", date: "2027-01-24", jangkaan: false },
    });
    // awal_ramadan is exactly 60 days away (inside); nuzul_quran is 76 (outside)
    expect(v.more).toEqual([{ event: expect.objectContaining({ key: "awal_ramadan", hijri: "1 Ramadan 1448H", jangkaan: true }), days: 60 }]);
  });
  it("leadDays limit: 65 days away is empty with 60, shown with 90", () => {
    expect(view("2026-11-20T10:00").kind).toBe("empty");
    expect(view("2026-11-20T10:00", { leadDays: 90 })).toMatchObject({ kind: "countdown", days: 65, event: { key: "nisfu_syaaban" } });
  });
  it("'Esok' = 1 day", () => {
    expect(view("2027-01-23T10:00")).toMatchObject({ kind: "countdown", days: 1, event: { key: "nisfu_syaaban" } });
  });
  it("showMore 0 lists nothing more; only included events count", () => {
    expect(view("2026-12-10T10:00", { showMore: 0 }).more).toEqual([]);
    expect(view("2026-12-10T10:00", { events: ["awal_ramadan"] })).toMatchObject({ kind: "countdown", days: 60, event: { key: "awal_ramadan" }, more: [] });
    expect(view("2026-12-10T10:00", { events: [] }).kind).toBe("empty");
  });
  it("nothing in range → empty (slide skipped)", () => {
    expect(view("2027-07-01T10:00")).toEqual({ kind: "empty", more: [] });
    expect(view("2026-12-10T10:00", {}, null, [])).toEqual({ kind: "empty", more: [] });
  });
});

describe("Malam ini (§5.4.2): Nisfu Syaaban on the eve", () => {
  it("before Maghrib on the eve → countdown 'Esok'", () => {
    expect(view("2027-01-23T19:00", {}, "2027-01-23T19:20")).toMatchObject({ kind: "countdown", days: 1 });
  });
  it("from Maghrib on the eve → 'Malam ini'", () => {
    expect(view("2027-01-23T19:20", {}, "2027-01-23T19:20")).toMatchObject({ kind: "malamIni", event: { key: "nisfu_syaaban" } });
    expect(view("2027-01-23T23:59", {}, "2027-01-23T19:20")).toMatchObject({ kind: "malamIni" });
  });
  it("no Maghrib time known → stays a countdown", () => {
    expect(view("2027-01-23T21:00")).toMatchObject({ kind: "countdown", days: 1 });
  });
  it("events without a night-before programme never show 'Malam ini'", () => {
    expect(view("2027-03-09T20:00", {}, "2027-03-09T19:25")).toMatchObject({ kind: "ramadan" }); // eve of Aidilfitri
  });
});

describe("greeting day (§5.4.1)", () => {
  it("on the day: the greeting", () => {
    expect(view("2027-01-24T08:00")).toMatchObject({ kind: "greeting", text: "Malam Nisfu Syaaban", event: { key: "nisfu_syaaban" } });
    expect(view("2027-05-17T08:00")).toMatchObject({ kind: "greeting", text: "Selamat Hari Raya Aidiladha", event: { jangkaan: false } });
  });
  it("Awal Muharram greets with the new Hijri year", () => {
    expect(view("2027-06-06T08:00")).toMatchObject({ kind: "greeting", text: "Salam Maal Hijrah 1449H" });
  });
  it("Aidilfitri day 1 and day 2 greet; day 3 does not", () => {
    expect(view("2027-03-10T08:00")).toMatchObject({ kind: "greeting", text: "Selamat Hari Raya Aidilfitri", event: { jangkaan: true } });
    expect(view("2027-03-11T23:00")).toMatchObject({ kind: "greeting", text: "Selamat Hari Raya Aidilfitri" });
    expect(view("2027-03-12T08:00").kind).not.toBe("greeting");
  });
  it("the greeting still lists the next events", () => {
    expect(view("2027-01-24T08:00").more.map((m) => [m.event.key, m.days])).toEqual([["awal_ramadan", 15], ["nuzul_quran", 31]]);
  });
});

describe("Ramadan (§5.4.3)", () => {
  it("day 1 is Awal Ramadan's greeting (first match wins)", () => {
    expect(view("2027-02-08T08:00")).toMatchObject({ kind: "greeting", text: "Ramadan Kareem" });
  });
  it("day 2: 'Hari ke-2', Aidilfitri in 29 days", () => {
    expect(view("2027-02-09T08:00")).toMatchObject({ kind: "ramadan", day: 2, aidilfitriInDays: 29, event: { key: "awal_ramadan", jangkaan: true } });
  });
  it("day 30: Aidilfitri tomorrow", () => {
    expect(view("2027-03-09T08:00")).toMatchObject({ kind: "ramadan", day: 30, aidilfitriInDays: 1 });
  });
  it("Nuzul Al-Quran inside Ramadan: 'Malam ini' on the eve, the greeting on the day", () => {
    expect(view("2027-02-23T19:30", {}, "2027-02-23T19:22")).toMatchObject({ kind: "malamIni", event: { key: "nuzul_quran" } });
    expect(view("2027-02-23T12:00", {}, "2027-02-23T19:22")).toMatchObject({ kind: "ramadan", day: 16 });
    expect(view("2027-02-24T08:00")).toMatchObject({ kind: "greeting", text: "Nuzul Al-Quran" });
  });
  it("without an Aidilfitri date in the takwim: at most 30 days, no Aidilfitri count", () => {
    const noFitri = TAKWIM.filter((e) => e.key !== "aidilfitri");
    expect(view("2027-03-09T08:00", {}, null, noFitri)).toMatchObject({ kind: "ramadan", day: 30, aidilfitriInDays: null });
    expect(view("2027-03-10T08:00", {}, null, noFitri).kind).not.toBe("ramadan");
  });
  it("Awal Ramadan not chosen for the slide → no Ramadan state", () => {
    expect(view("2027-02-09T08:00", { events: ["aidilfitri"] })).toMatchObject({ kind: "countdown", event: { key: "aidilfitri" }, days: 29 });
  });
});

describe("playlist skip rule (§7.2)", () => {
  const data = { islamicEvents: TAKWIM, roster: EMPTY_ROSTER };
  it("hari_kebesaran is empty when nothing is in range", () => {
    expect(slideIsEmpty("hari_kebesaran", {}, data, at("2026-11-20T10:00"))).toBe(true);
    expect(slideIsEmpty("hari_kebesaran", { leadDays: 90 }, data, at("2026-11-20T10:00"))).toBe(false);
    expect(slideIsEmpty("hari_kebesaran", {}, data, at("2027-02-09T10:00"))).toBe(false);
    expect(slideIsEmpty("hari_kebesaran", {}, { islamicEvents: [], roster: EMPTY_ROSTER }, at("2027-02-09T10:00"))).toBe(true);
  });
  it("other templates are never empty by this rule", () => {
    expect(slideIsEmpty("kuliah", {}, { islamicEvents: [], roster: EMPTY_ROSTER }, at("2026-11-20T10:00"))).toBe(false);
    expect(slideIsEmpty(null, {}, { islamicEvents: [], roster: EMPTY_ROSTER }, at("2026-11-20T10:00"))).toBe(false);
  });
});
