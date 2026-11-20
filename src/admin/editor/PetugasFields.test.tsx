// Jadual Imam & Bilal editor (PRD enhancements §6.4, E15): picker, extras, old-template notice.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Roster } from "@/core";
import { PICKER_HIDDEN, TEMPLATE_KEYS } from "@/templates";
import { LangProvider } from "../i18n";
import ms from "../i18n/ms.json";
import { rowsToRoster, type Petugas, type SlotRow } from "../petugas/logic";
import { LegacyImamBilalNotice } from "./EditorView";
import { PetugasFields } from "./PetugasFields";
import { PickerView } from "./PickerView";

const wrap = (node: React.ReactNode) => renderToStaticMarkup(<LangProvider>{node}</LangProvider>);
const fields = (view: string, roster: Roster | null, error: string | null = null) => wrap(<PetugasFields fields={{ view }} roster={roster} error={error} />);
const amp = (s: string) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;");

const P = (id: string, name: string, active = true, sort_order = 1): Petugas => ({ id, name, title: null, roles: ["imam", "bilal"], active, sort_order });
const DAY_ONLY: Roster = { petugas: [{ id: "a", name: "Ali", title: null, roles: ["imam"] }], slots: [{ day: 1, waktu: null, role: "imam", petugasId: "a" }] };
const WITH_WAKTU: Roster = { ...DAY_ONLY, slots: [...DAY_ONLY.slots, { day: 5, waktu: "zohor", role: "imam", petugasId: "a" }] };

describe("template picker", () => {
  it("shows 12 templates: Jadual Imam & Bilal in, the old Imam & Bilal out", () => {
    expect(PICKER_HIDDEN).toEqual(["imam_bilal"]);
    const html = wrap(<PickerView />);
    const cards = [...html.matchAll(/href="\/admin\/templat\/?\?key=([a-z_]+)"/g)].map((m) => m[1]);
    expect(cards).toHaveLength(12);
    expect(cards).toContain("jadual_petugas");
    expect(cards).not.toContain("imam_bilal");
    expect(TEMPLATE_KEYS).toContain("imam_bilal"); // still renders and stays editable
  });
});

describe("Jadual Imam & Bilal editor extras", () => {
  it("links to the Petugas page; the week hint only when per-waktu exceptions exist", () => {
    const plain = fields("minggu", DAY_ONLY);
    expect(plain).toContain(amp(ms.editor.petugas.manage));
    expect(plain).toMatch(/href="\/admin\/petugas\/?"/);
    expect(plain).not.toContain("data-petugas-hint");
    const hint = fields("minggu", WITH_WAKTU);
    expect(hint).toContain("data-petugas-hint");
    expect(hint).toContain(amp(ms.editor.petugas.weekHint));
    expect(fields("hari_ini", WITH_WAKTU)).not.toContain("data-petugas-hint");
  });

  it("empty roster: a message and a link to fill it in (names first when there are none)", () => {
    const none = fields("minggu", { petugas: [], slots: [] });
    expect(none).toContain("data-petugas-empty");
    expect(none).toContain(ms.editor.petugas.emptyNoPeople.slice(0, 20));
    expect(none).toMatch(/href="\/admin\/petugas\/?\?tab=senarai"/);
    const noSlots = fields("minggu", { petugas: DAY_ONLY.petugas, slots: [] });
    expect(noSlots).toContain(ms.editor.petugas.emptyNoSlots.slice(0, 20));
    expect(noSlots).toMatch(/href="\/admin\/petugas\/?\?tab=jadual"/);
  });

  it("loading and load errors", () => {
    expect(fields("minggu", null)).toContain(ms.app.loading);
    const err = fields("minggu", null, "boom");
    expect(err).toContain('role="alert"');
    expect(err).toContain("boom");
  });
});

describe("roster for the preview (as in the TV bundle)", () => {
  it("only active petugas, in list order, and only their slots", () => {
    const list = [P("b", "Badrul", true, 2), P("a", "Ali", true, 1), P("x", "Lama", false, 3)];
    const slots: SlotRow[] = [
      { day_of_week: 1, waktu: null, role: "imam", petugas_id: "a" },
      { day_of_week: 2, waktu: "subuh", role: "bilal", petugas_id: "b" },
      { day_of_week: 3, waktu: null, role: "imam", petugas_id: "x" },
    ];
    const r = rowsToRoster(list, slots);
    expect(r.petugas.map((p) => p.id)).toEqual(["a", "b"]);
    expect(r.slots).toEqual([
      { day: 1, waktu: null, role: "imam", petugasId: "a" },
      { day: 2, waktu: "subuh", role: "bilal", petugasId: "b" },
    ]);
  });
});

describe("old imam_bilal slide", () => {
  it("shows the migration notice with a button to a new Jadual Imam & Bilal", () => {
    const html = wrap(<LegacyImamBilalNotice />);
    expect(html).toContain(amp(ms.editor.legacyImamBilal));
    expect(html).toContain('href="/admin/templat/?key=jadual_petugas"');
    expect(html).toContain(amp(ms.editor.legacyImamBilalCta));
  });
});
