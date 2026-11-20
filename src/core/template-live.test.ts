import { describe, expect, it } from "vitest";
import { ROSTER_TITLE_DEFAULT, activityLive, clockText, countdownLive, formatDateShortBm, penangguhanLive, rosterLive, templateLive } from "./template-live";
import { parseLocalDateTime } from "./time";

const at = (s: string) => parseLocalDateTime(s)!;
const KULIAH = { series: "Kuliah Maghrib", topic: "Adab", speaker: "Ustaz Ahmad", date: "Sabtu, 28 November 2026", dateIso: "2026-11-28", time: "8:45 malam", venue: "Dewan" };

describe("text helpers", () => {
  it("short BM date", () => {
    expect(formatDateShortBm("2026-11-28")).toBe("Sabtu, 28 Nov");
    expect(formatDateShortBm("2026-12-05")).toBe("Sabtu, 5 Dis");
    expect(formatDateShortBm("2027-08-02")).toBe("Isnin, 2 Ogo");
    expect(formatDateShortBm("2026-02-31")).toBe("");
  });
  it("clock text follows 12h / 24h; prayer-relative text unchanged", () => {
    expect(clockText("8:45 malam", false)).toBe("8:45 malam");
    expect(clockText("8:45 malam", true)).toBe("20:45");
    expect(clockText("Selepas Maghrib", true)).toBe("Selepas Maghrib");
  });
});

describe("countdown line text (contract rule 23)", () => {
  it("each state with its strong part", () => {
    expect(countdownLive({ kind: "days", days: 3 })).toEqual({ state: "days", text: "Lagi 3 hari", strong: "3" });
    expect(countdownLive({ kind: "tomorrow", time: "8:45 malam" })).toEqual({ state: "tomorrow", text: "Esok · 8:45 malam", strong: "Esok" });
    expect(countdownLive({ kind: "tomorrow", time: "" })).toEqual({ state: "tomorrow", text: "Esok", strong: "Esok" });
    expect(countdownLive({ kind: "today", time: "Selepas Maghrib" })).toEqual({ state: "today", text: "Hari ini · Selepas Maghrib", strong: "Hari ini" });
    expect(countdownLive({ kind: "minutes", mm: 42, ss: 15, text: "42:15" })).toEqual({ state: "minutes", text: "Bermula dalam 42:15", strong: "42:15" });
    expect(countdownLive({ kind: "ongoing" })).toEqual({ state: "ongoing", text: "Sedang berlangsung", strong: "Sedang berlangsung" });
    expect(countdownLive({ kind: "none" })).toBeUndefined();
  });
});

describe("activityLive (kuliah / program / mesyuarat)", () => {
  it("countdown only, no notice", () => {
    expect(activityLive(KULIAH, at("2026-11-28T20:00"))).toEqual({ countdown: { state: "minutes", text: "Bermula dalam 45:00", strong: "45:00" } });
    expect(activityLive(KULIAH, at("2026-11-29T10:00"))).toEqual({});
  });
  it("Tangguh with a new date: notice texts and a countdown to the new date", () => {
    const f = { ...KULIAH, notice: { kind: "tangguh", newAt: "2026-12-05T20:45", reason: "Penceramah uzur" } };
    expect(activityLive(f, at("2026-11-28T20:00"))).toEqual({
      countdown: { state: "days", text: "Lagi 7 hari", strong: "7" },
      notice: { kind: "tangguh", originalText: "Sabtu, 28 November 2026 · 8:45 malam", newText: "Sabtu, 5 Dis · 8:45 malam", reason: "Penceramah uzur" },
    });
    expect(activityLive(f, at("2026-11-28T20:00"), true).notice).toMatchObject({ originalText: "Sabtu, 28 November 2026 · 20:45", newText: "Sabtu, 5 Dis · 20:45" });
  });
  it("Tangguh without a date and Batal: notice, no countdown", () => {
    expect(activityLive({ ...KULIAH, notice: { kind: "tangguh", newAt: null } }, at("2026-11-28T20:00"))).toEqual({
      notice: { kind: "tangguh", originalText: "Sabtu, 28 November 2026 · 8:45 malam", newText: null, reason: null },
    });
    expect(activityLive({ ...KULIAH, notice: { kind: "batal", reason: "Hujan lebat" } }, at("2026-11-28T20:00"))).toEqual({
      notice: { kind: "batal", originalText: "Sabtu, 28 November 2026 · 8:45 malam", newText: null, reason: "Hujan lebat" },
    });
  });
});

describe("penangguhanLive", () => {
  const P = { title: "Kuliah Maghrib: Adab", kind: "tangguh", date: "Sabtu, 28 November 2026", time: "Selepas Maghrib", newDateIso: "2026-12-05", newTime: "Selepas Maghrib", reason: "Penceramah uzur" };
  it("always a notice; the new date may be prayer-relative", () => {
    expect(penangguhanLive(P)).toEqual({ notice: { kind: "tangguh", originalText: "Sabtu, 28 November 2026 · Selepas Maghrib", newText: "Sabtu, 5 Dis · Selepas Maghrib", reason: "Penceramah uzur" } });
    expect(penangguhanLive({ ...P, newDateIso: undefined }).notice?.newText).toBeNull();
    expect(penangguhanLive({ ...P, kind: "batal" }).notice).toMatchObject({ kind: "batal", newText: null });
    expect(penangguhanLive({ ...P, newTime: "9:00 malam" }, true).notice?.newText).toBe("Sabtu, 5 Dis · 21:00");
  });
});

describe("hari_kebesaran live text (§5.4)", () => {
  // TEST DATES ONLY
  const EV = [
    { key: "nisfu_syaaban", hijriYear: 1448, date: "2027-01-24", status: "rasmi" },
    { key: "awal_ramadan", hijriYear: 1448, date: "2027-02-08", status: "jangkaan" },
    { key: "nuzul_quran", hijriYear: 1448, date: "2027-02-24", status: "jangkaan" },
    { key: "aidilfitri", hijriYear: 1448, date: "2027-03-10", status: "jangkaan" },
  ] as const;
  const live = (when: string, maghrib: string | null = null) =>
    templateLive("hari_kebesaran", {}, at(when), false, { islamicEvents: EV, maghribTodayMs: maghrib ? at(maghrib) : null })?.islamicEvents;

  it("countdown: big number + 'hari lagi', event, Hijri and BM date, next events", () => {
    expect(live("2026-12-10T10:00")).toEqual({
      mode: "countdown", title: "Nisfu Syaaban", big: "45", bigCaption: "hari lagi", hijri: "15 Syaaban 1448H", gregorian: "Ahad, 24 Jan 2027", jangkaan: false,
      more: [{ label: "Awal Ramadan", days: "60 hari", jangkaan: true }],
    });
  });
  it("one day before: 'Esok' as the big figure, no caption", () => {
    expect(live("2027-01-23T10:00")).toMatchObject({ mode: "countdown", big: "Esok", title: "Nisfu Syaaban" });
    expect(live("2027-01-23T10:00")?.bigCaption).toBeUndefined();
  });
  it("Malam ini after Maghrib on the eve", () => {
    expect(live("2027-01-23T19:30", "2027-01-23T19:20")).toMatchObject({ mode: "malamIni", title: "Malam ini", sub: "Nisfu Syaaban", hijri: "15 Syaaban 1448H" });
  });
  it("Ramadan: 'Ramadan · Hari ke-12', big 12, Aidilfitri count", () => {
    expect(live("2027-02-19T10:00")).toMatchObject({ mode: "ramadan", title: "Ramadan · Hari ke-12", big: "12", bigCaption: "Ramadan", sub: "Aidilfitri dalam 19 hari", hijri: "12 Ramadan 1448H", jangkaan: true });
    expect(live("2027-03-09T10:00")).toMatchObject({ big: "30", sub: "Aidilfitri esok" });
  });
  it("greeting: Aidilfitri day 1 and day 2 (with that day's Hijri and BM date)", () => {
    expect(live("2027-03-10T08:00")).toMatchObject({ mode: "greeting", title: "Selamat Hari Raya Aidilfitri", hijri: "1 Syawal 1448H", gregorian: "Rabu, 10 Mac 2027" });
    expect(live("2027-03-11T08:00")).toMatchObject({ mode: "greeting", hijri: "2 Syawal 1448H", gregorian: "Khamis, 11 Mac 2027" });
    expect(live("2027-01-24T08:00")).toMatchObject({ title: "Malam Nisfu Syaaban", sub: undefined });
  });
  it("nothing in range → no live (the slide is skipped)", () => {
    expect(live("2027-07-01T10:00")).toBeUndefined();
    expect(templateLive("hari_kebesaran", {}, at("2027-01-01T10:00"))).toBeUndefined(); // no takwim
  });
});

describe("templateLive", () => {
  it("only the activity templates and penangguhan have live data", () => {
    expect(templateLive("program", KULIAH, at("2026-11-25T10:00"))).toEqual({ countdown: { state: "days", text: "Lagi 3 hari", strong: "3" } });
    expect(templateLive("penangguhan", { title: "X", kind: "batal", date: "", time: "" }, 0)?.notice?.kind).toBe("batal");
    for (const k of ["kematian", "pengumuman", "infaq", "ucapan"]) expect(templateLive(k, KULIAH, at("2026-11-28T20:00")), k).toBeUndefined();
  });
});

describe("jadual_petugas (rosterLive)", () => {
  // 2026-11-20 is a Friday (Jumaat, day 5).
  const P = (id: string, name: string, title: string | null = null) => ({ id, name, title, roles: ["imam", "bilal"] as ("imam" | "bilal")[] });
  const ROSTER = {
    petugas: [P("a", "Ahmad", "Ust."), P("b", "Badrul"), P("c", "Hafiz", "Ust.")],
    slots: [
      { day: 5, waktu: null, role: "imam" as const, petugasId: "a" },
      { day: 5, waktu: null, role: "bilal" as const, petugasId: "b" },
      { day: 5, waktu: "zohor" as const, role: "imam" as const, petugasId: "c" },
      { day: 6, waktu: null, role: "imam" as const, petugasId: "c" },
    ],
  };

  it("minggu: Isnin → Ahad, today marked, per-waktu flag, dash when empty", () => {
    const r = rosterLive({ view: "minggu" }, ROSTER, at("2026-11-20T10:00"))!;
    expect(r.title).toBe(ROSTER_TITLE_DEFAULT);
    expect(r.rows.map((x) => x.label)).toEqual(["Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu", "Ahad"]);
    expect(r.rows.filter((x) => x.today).map((x) => x.label)).toEqual(["Jumaat"]);
    expect(r.rows[4]).toMatchObject({ imam: "Ust. Ahmad", bilal: "Badrul", perWaktu: true });
    expect(r.rows[5]).toMatchObject({ imam: "Ust. Hafiz", bilal: "—" });
    expect(r.rows[0]).toMatchObject({ imam: "—", bilal: "—" });
    expect(r.tomorrow).toBeUndefined();
  });

  it("hari_ini: 5 waktu, Zohor shows Jumaat on Friday, the exception wins, tomorrow line", () => {
    const r = rosterLive({ view: "hari_ini", title: "  Petugas  " }, ROSTER, at("2026-11-20T10:00"))!;
    expect(r.title).toBe("Petugas");
    expect(r.subtitle).toBe("Hari ini · Jumaat");
    expect(r.rows).toHaveLength(5);
    expect(r.rows[1]).toMatchObject({ label: "Jumaat", imam: "Ust. Hafiz", bilal: "Badrul" });
    expect(r.rows[0]).toMatchObject({ imam: "Ust. Ahmad" });
    expect(r.tomorrow).toBe("Esok: Imam Ust. Hafiz · Bilal —");
  });

  it("the day changes at local midnight", () => {
    const before = rosterLive({ view: "minggu" }, ROSTER, at("2026-11-20T23:59:59"))!;
    const after = rosterLive({ view: "minggu" }, ROSTER, at("2026-11-21T00:00:00"))!;
    expect(before.rows.find((x) => x.today)!.label).toBe("Jumaat");
    expect(after.rows.find((x) => x.today)!.label).toBe("Sabtu");
  });

  it("an empty roster gives nothing (the slide is skipped)", () => {
    expect(rosterLive({ view: "minggu" }, { petugas: [], slots: [] }, at("2026-11-20T10:00"))).toBeUndefined();
    expect(templateLive("jadual_petugas", { view: "minggu" }, at("2026-11-20T10:00"))).toBeUndefined();
    expect(templateLive("jadual_petugas", { view: "minggu" }, at("2026-11-20T10:00"), false, { roster: ROSTER })?.roster?.view).toBe("minggu");
  });
});
