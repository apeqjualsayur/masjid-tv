import { describe, expect, it } from "vitest";
import {
  clearDay, copyDay, displayName, emptyGrid, gridFromSlots, gridToSlots, gridsEqual, hasExceptions, optionsFor, petugasErrorKey, petugasPayload, removedRoles, reorderUpdates, setSlot, validatePetugas,
  WEEKDAYS, type Petugas, type SlotRow,
} from "./logic";

const P = (id: string, name: string, roles: Petugas["roles"], o: Partial<Petugas> = {}): Petugas => ({ id, name, title: null, roles, active: true, sort_order: 0, ...o });
const LIST = [P("zaki", "Ahmad Zaki", ["imam"], { title: "Ust.", sort_order: 1 }), P("hafiz", "Hafiz", ["imam", "bilal"], { title: "Hj.", sort_order: 2 }), P("rahim", "Rahim", ["bilal"], { sort_order: 3 }), P("old", "Lama", ["imam"], { active: false, sort_order: 4 })];

describe("petugas form", () => {
  it("name 2–60, title ≤ 20, at least one role (the database rules)", () => {
    expect(validatePetugas({ name: "Ahmad", title: "Ust.", roles: ["imam"] })).toEqual({});
    expect(validatePetugas({ name: " ", title: "", roles: [] })).toEqual({ name: "required", roles: "required" });
    expect(validatePetugas({ name: "A", title: "", roles: ["bilal"] })).toEqual({ name: "length" });
    expect(validatePetugas({ name: "a".repeat(61), title: "x".repeat(21), roles: ["imam"] })).toEqual({ name: "length", title: "tooLong" });
  });
  it("payload: trimmed, empty title → null, roles in a fixed order", () => {
    expect(petugasPayload({ name: " Ahmad ", title: " ", roles: ["bilal", "imam"], active: true })).toEqual({ name: "Ahmad", title: null, roles: ["imam", "bilal"], active: true });
  });
  it("removing a role is detected (its roster slots will be emptied)", () => {
    expect(removedRoles(["imam", "bilal"], ["bilal"])).toEqual(["imam"]);
    expect(removedRoles(["imam"], ["imam", "bilal"])).toEqual([]);
  });
  it("display name and reorder updates", () => {
    expect(displayName(LIST[0])).toBe("Ust. Ahmad Zaki");
    expect(displayName(LIST[2])).toBe("Rahim");
    expect(reorderUpdates(LIST, ["hafiz", "zaki", "rahim", "old"])).toEqual([{ id: "hafiz", sort_order: 1 }, { id: "zaki", sort_order: 2 }]);
  });
});

describe("roster grid ↔ roster_save payload", () => {
  const SLOTS: SlotRow[] = [
    { day_of_week: 1, waktu: null, role: "imam", petugas_id: "zaki" },
    { day_of_week: 1, waktu: null, role: "bilal", petugas_id: "rahim" },
    { day_of_week: 4, waktu: "isyak", role: "imam", petugas_id: "hafiz" }, // Khamis Isyak exception
    { day_of_week: 5, waktu: "zohor", role: "bilal", petugas_id: "hafiz" },
  ];

  it("slots → grid → payload, in a fixed order, exceptions kept", () => {
    const g = gridFromSlots(SLOTS);
    expect(g[1].all).toEqual({ imam: "zaki", bilal: "rahim" });
    expect(g[4].waktu.isyak).toEqual({ imam: "hafiz", bilal: null });
    expect(hasExceptions(g[4])).toBe(true);
    expect(hasExceptions(g[1])).toBe(false);
    expect(gridToSlots(g)).toEqual([
      { day: 1, waktu: null, role: "imam", petugasId: "zaki" },
      { day: 1, waktu: null, role: "bilal", petugasId: "rahim" },
      { day: 4, waktu: "isyak", role: "imam", petugasId: "hafiz" },
      { day: 5, waktu: "zohor", role: "bilal", petugasId: "hafiz" },
    ]);
  });

  it("payload → slots → the same grid (a save and reload round-trip)", () => {
    const g = gridFromSlots(SLOTS);
    const back = gridFromSlots(gridToSlots(g).map((s) => ({ day_of_week: s.day, waktu: s.waktu, role: s.role, petugas_id: s.petugasId })));
    expect(gridsEqual(back, g)).toBe(true);
  });

  it("an empty grid saves nothing; blanks are left out", () => {
    expect(gridToSlots(emptyGrid())).toEqual([]);
    expect(gridToSlots(setSlot(emptyGrid(), 2, null, "imam", null))).toEqual([]);
  });

  it("Salin ke hari bekerja: Isnin onto Selasa–Jumaat (with exceptions), weekend untouched", () => {
    let g = setSlot(setSlot(emptyGrid(), 1, null, "imam", "zaki"), 1, "maghrib", "bilal", "rahim");
    g = setSlot(g, 6, null, "imam", "hafiz");
    const c = copyDay(g, 1, WEEKDAYS);
    for (const d of [2, 3, 4, 5]) {
      expect(c[d].all.imam).toBe("zaki");
      expect(c[d].waktu.maghrib.bilal).toBe("rahim");
    }
    expect(c[6].all.imam).toBe("hafiz");
    expect(c[7].all.imam).toBeNull();
    expect(gridToSlots(c)).toHaveLength(11); // 5 days × 2 + Sabtu
  });

  it("a copied day is independent of the source", () => {
    const c = copyDay(setSlot(emptyGrid(), 1, null, "imam", "zaki"), 1, [2]);
    const changed = setSlot(c, 2, null, "imam", "hafiz");
    expect(changed[1].all.imam).toBe("zaki");
  });

  it("Kosongkan hari clears that day only", () => {
    const g = clearDay(gridFromSlots(SLOTS), 1);
    expect(gridToSlots(g).some((s) => s.day === 1)).toBe(false);
    expect(gridToSlots(g)).toHaveLength(2);
  });
});

describe("dropdown choices and errors", () => {
  it("only active petugas with that role; a chosen inactive one stays visible", () => {
    expect(optionsFor(LIST, "imam", null).map((o) => o.id)).toEqual(["zaki", "hafiz"]);
    expect(optionsFor(LIST, "bilal", null).map((o) => o.id)).toEqual(["hafiz", "rahim"]);
    expect(optionsFor(LIST, "imam", "old")).toContainEqual({ id: "old", label: "Lama", inactive: true });
  });
  it("database errors become clear messages", () => {
    expect(petugasErrorKey({ message: "petugas_full" })).toBe("petugas.err.full");
    expect(petugasErrorKey({ message: "bad_petugas" })).toBe("petugas.err.badPetugas");
    expect(petugasErrorKey({ message: "not_allowed", code: "42501" })).toBe("petugas.err.notAllowed");
    expect(petugasErrorKey({ message: "duplicate key", code: "23505" })).toBe("petugas.err.duplicate");
    expect(petugasErrorKey({ message: "TypeError: Failed to fetch" })).toBe("petugas.err.network");
    expect(petugasErrorKey(null)).toBeNull();
  });
});
