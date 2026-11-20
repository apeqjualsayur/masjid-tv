import { describe, expect, it } from "vitest";
import { activityLive, clockText, countdownLive, formatDateShortBm, penangguhanLive, templateLive } from "./template-live";
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

describe("templateLive", () => {
  it("only the activity templates and penangguhan have live data", () => {
    expect(templateLive("program", KULIAH, at("2026-11-25T10:00"))).toEqual({ countdown: { state: "days", text: "Lagi 3 hari", strong: "3" } });
    expect(templateLive("penangguhan", { title: "X", kind: "batal", date: "", time: "" }, 0)?.notice?.kind).toBe("batal");
    for (const k of ["kematian", "pengumuman", "infaq", "ucapan"]) expect(templateLive(k, KULIAH, at("2026-11-28T20:00")), k).toBeUndefined();
  });
});
