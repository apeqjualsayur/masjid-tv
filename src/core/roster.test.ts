import { describe, expect, it } from "vitest";
import { dayRoster, EMPTY_ROSTER, hasWaktuExceptions, resolveRoster, rosterDayOf, rosterIsEmpty, weekRoster, type Roster } from "./roster";
import { slideIsEmpty } from "./slide-empty";
import { parseLocalDateTime } from "./time";

// Week of Monday 23 Nov 2026 … Sunday 29 Nov 2026. 27 Nov is a Friday.
const R: Roster = {
  petugas: [
    { id: "zaki", name: "Ahmad Zaki", title: "Ust.", roles: ["imam"] },
    { id: "rahim", name: "Rahim", title: null, roles: ["bilal"] },
    { id: "hafiz", name: "Hafiz", title: "Hj.", roles: ["imam", "bilal"] },
  ],
  slots: [
    // Isnin: all day
    { day: 1, waktu: null, role: "imam", petugasId: "zaki" },
    { day: 1, waktu: null, role: "bilal", petugasId: "rahim" },
    // Isnin Maghrib exception: Hafiz as imam
    { day: 1, waktu: "maghrib", role: "imam", petugasId: "hafiz" },
    // Jumaat: all day + a Zohor (Jumaat) imam
    { day: 5, waktu: null, role: "imam", petugasId: "zaki" },
    { day: 5, waktu: "zohor", role: "imam", petugasId: "hafiz" },
    { day: 5, waktu: "zohor", role: "bilal", petugasId: "rahim" },
    // Sabtu: only a Subuh bilal, no all-day slots
    { day: 6, waktu: "subuh", role: "bilal", petugasId: "hafiz" },
    // Ahad: points to someone not in the bundle (deactivated)
    { day: 7, waktu: null, role: "imam", petugasId: "gone" },
  ],
};
const name = (p: { display: string } | null) => p?.display ?? "—";

describe("days", () => {
  it("date → roster day (1 = Isnin … 7 = Ahad)", () => {
    expect(rosterDayOf("2026-11-23")).toBe(1);
    expect(rosterDayOf("2026-11-27")).toBe(5);
    expect(rosterDayOf("2026-11-29")).toBe(7);
  });
});

describe("resolveRoster (§6.1)", () => {
  it("all-day slot for the day; title + name", () => {
    const r = resolveRoster(R, "2026-11-23");
    expect(r.imam).toEqual({ id: "zaki", name: "Ahmad Zaki", title: "Ust.", display: "Ust. Ahmad Zaki" });
    expect(r.bilal).toMatchObject({ display: "Rahim" });
  });
  it("a waktu slot overrides the all-day slot; other waktu follow the day", () => {
    expect(name(resolveRoster(R, "2026-11-23", "maghrib").imam)).toBe("Hj. Hafiz");
    expect(name(resolveRoster(R, "2026-11-23", "maghrib").bilal)).toBe("Rahim");
    expect(name(resolveRoster(R, "2026-11-23", "isyak").imam)).toBe("Ust. Ahmad Zaki");
    expect(name(resolveRoster(R, "2026-11-23").imam)).toBe("Ust. Ahmad Zaki"); // no waktu = all-day only
  });
  it("same weekday next week resolves the same", () => {
    expect(name(resolveRoster(R, "2026-11-30", "maghrib").imam)).toBe("Hj. Hafiz");
  });
  it("nothing set → null ('—')", () => {
    expect(resolveRoster(R, "2026-11-24")).toEqual({ imam: null, bilal: null }); // Selasa: empty
    expect(resolveRoster(R, "2026-11-28", "asar")).toEqual({ imam: null, bilal: null }); // Sabtu Asar
    expect(name(resolveRoster(R, "2026-11-28", "subuh").bilal)).toBe("Hj. Hafiz");
  });
  it("a petugas missing from the bundle (inactive) → null", () => {
    expect(resolveRoster(R, "2026-11-29").imam).toBeNull();
  });
  it("empty roster → null everywhere", () => {
    expect(resolveRoster(EMPTY_ROSTER, "2026-11-23", "subuh")).toEqual({ imam: null, bilal: null });
  });
});

describe("weekRoster (minggu view, §6.4)", () => {
  it("7 rows Isnin → Ahad, all-day names, today highlighted, '+ ikut waktu' marker", () => {
    const w = weekRoster(R, "2026-11-27");
    expect(w.map((r) => r.label)).toEqual(["Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu", "Ahad"]);
    expect(w.map((r) => [name(r.imam), name(r.bilal)])).toEqual([
      ["Ust. Ahmad Zaki", "Rahim"],
      ["—", "—"],
      ["—", "—"],
      ["—", "—"],
      ["Ust. Ahmad Zaki", "—"],
      ["—", "—"],
      ["—", "—"],
    ]);
    expect(w.filter((r) => r.isToday).map((r) => r.label)).toEqual(["Jumaat"]);
    expect(w.filter((r) => r.hasWaktuExceptions).map((r) => r.label)).toEqual(["Isnin", "Jumaat", "Sabtu"]);
  });
  it("without a date nothing is highlighted", () => {
    expect(weekRoster(R).some((r) => r.isToday)).toBe(false);
  });
  it("hasWaktuExceptions per day", () => {
    expect(hasWaktuExceptions(R, 1)).toBe(true);
    expect(hasWaktuExceptions(R, 2)).toBe(false);
    expect(hasWaktuExceptions(R, 7)).toBe(false);
  });
});

describe("dayRoster (hari_ini view, §6.4)", () => {
  it("5 waktu resolved, plus tomorrow's all-day pair", () => {
    const d = dayRoster(R, "2026-11-23");
    expect(d.rows.map((r) => [r.label, name(r.imam), name(r.bilal)])).toEqual([
      ["Subuh", "Ust. Ahmad Zaki", "Rahim"],
      ["Zohor", "Ust. Ahmad Zaki", "Rahim"],
      ["Asar", "Ust. Ahmad Zaki", "Rahim"],
      ["Maghrib", "Hj. Hafiz", "Rahim"],
      ["Isyak", "Ust. Ahmad Zaki", "Rahim"],
    ]);
    expect(d.tomorrow).toEqual({ imam: null, bilal: null }); // Selasa
  });
  it("Friday: Zohor is labelled Jumaat and uses its own slot", () => {
    const d = dayRoster(R, "2026-11-27");
    expect(d.rows[1]).toMatchObject({ waktu: "zohor", label: "Jumaat" });
    expect([name(d.rows[1].imam), name(d.rows[1].bilal)]).toEqual(["Hj. Hafiz", "Rahim"]);
    expect([name(d.rows[0].imam), name(d.rows[0].bilal)]).toEqual(["Ust. Ahmad Zaki", "—"]);
    expect(dayRoster(R, "2026-11-26").rows[1].label).toBe("Zohor");
  });
  it("Sunday → tomorrow is Monday", () => {
    expect(name(dayRoster(R, "2026-11-29").tomorrow.imam)).toBe("Ust. Ahmad Zaki");
  });
});

describe("empty grid → slide skipped", () => {
  const at = parseLocalDateTime("2026-11-23T10:00")!;
  it("no slots, or only slots pointing to missing petugas", () => {
    expect(rosterIsEmpty(EMPTY_ROSTER)).toBe(true);
    expect(rosterIsEmpty({ petugas: R.petugas, slots: [] })).toBe(true);
    expect(rosterIsEmpty({ petugas: [], slots: R.slots })).toBe(true);
    expect(rosterIsEmpty(R)).toBe(false);
  });
  it("slideIsEmpty for jadual_petugas", () => {
    expect(slideIsEmpty("jadual_petugas", {}, { islamicEvents: [], roster: EMPTY_ROSTER }, at)).toBe(true);
    expect(slideIsEmpty("jadual_petugas", {}, { islamicEvents: [], roster: R }, at)).toBe(false);
  });
});
