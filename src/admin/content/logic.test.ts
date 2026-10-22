import { describe, expect, it } from "vitest";
import { localToEpoch } from "@/core";
import { applyReorder, countTabs, dateLabel, daysLabel, daysLeft, duplicateRow, move, screensLabel, tabOf, titleOf, toggledStatus, visibleRows, type ContentRow } from "./logic";

const NOW = localToEpoch(2026, 10, 22, 10, 0);
const iso = (y: number, m: number, d: number, h = 0, mi = 0) => new Date(localToEpoch(y, m, d, h, mi)).toISOString();
let n = 0;
function row(over: Partial<ContentRow>): ContentRow {
  n++;
  return {
    id: `r${n}`, type: "template", template_key: "pengumuman", fields: { title: `Tajuk ${n}` }, media_id: null, status: "published",
    starts_at: iso(2026, 10, 20), ends_at: null, duration_s: 15, days_of_week: null, priority: false, sort_order: n, screen_ids: null,
    created_at: `2026-10-${String(10 + n).padStart(2, "0")}T00:00:00Z`, ...over,
  };
}

describe("tabs", () => {
  it("Aktif: published or paused, started, not ended", () => {
    expect(tabOf(row({}), NOW)).toBe("aktif");
    expect(tabOf(row({ status: "paused" }), NOW)).toBe("aktif");
    expect(tabOf(row({ ends_at: iso(2026, 10, 25) }), NOW)).toBe("aktif");
  });
  it("Dijadual: future start, or draft", () => {
    expect(tabOf(row({ starts_at: iso(2026, 11, 1) }), NOW)).toBe("dijadual");
    expect(tabOf(row({ status: "draft" }), NOW)).toBe("dijadual");
  });
  it("Tamat: ended (end is exclusive), whatever the status", () => {
    expect(tabOf(row({ ends_at: iso(2026, 10, 22, 10, 0) }), NOW)).toBe("tamat");
    expect(tabOf(row({ status: "draft", ends_at: iso(2026, 10, 21) }), NOW)).toBe("tamat");
  });
  it("counts", () => {
    expect(countTabs([row({}), row({ status: "paused" }), row({ status: "draft" }), row({ ends_at: iso(2026, 10, 1) })], NOW)).toEqual({ aktif: 2, dijadual: 1, tamat: 1 });
  });
});

describe("visible rows", () => {
  const a = row({ sort_order: 2, fields: { title: "Gotong-royong Perdana" }, screen_ids: ["s1"] });
  const b = row({ sort_order: 1, template_key: "kuliah", fields: { series: "Kuliah Maghrib", topic: "Adab" } });
  const c = row({ sort_order: 2, fields: { title: "Hari Keluarga" }, screen_ids: ["s2"], created_at: "2026-10-30T00:00:00Z" });
  it("playlist order: sort_order then created_at", () => {
    expect(visibleRows([a, b, c], "aktif", NOW).map((r) => r.id)).toEqual([b.id, a.id, c.id]);
  });
  it("search title and type; screen filter keeps 'all screens' rows", () => {
    expect(visibleRows([a, b, c], "aktif", NOW, "adab").map((r) => r.id)).toEqual([b.id]);
    expect(visibleRows([a, b, c], "aktif", NOW, "kuliah", null, (r) => (r.template_key === "kuliah" ? "Kuliah" : "")).map((r) => r.id)).toEqual([b.id]);
    expect(visibleRows([a, b, c], "aktif", NOW, "", "s1").map((r) => r.id)).toEqual([b.id, a.id]);
  });
  it("titles from the template fields", () => {
    expect(titleOf(b)).toBe("Kuliah Maghrib: Adab");
    expect(titleOf(row({ type: "poster", template_key: null, fields: {} }))).toBe("");
  });
});

describe("reorder", () => {
  it("move within a list", () => {
    expect(move(["a", "b", "c", "d"], 3, 0)).toEqual(["d", "a", "b", "c"]);
    expect(move(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
  });
  it("reordering a filtered tab keeps hidden slides in their places", () => {
    const rows = [row({ id: "A", sort_order: 1 }), row({ id: "X", sort_order: 2, status: "draft" }), row({ id: "B", sort_order: 3 }), row({ id: "C", sort_order: 4 })];
    // Aktif shows A, B, C; the user drags C to the top.
    expect(applyReorder(rows, ["C", "A", "B"])).toEqual(["C", "X", "A", "B"]);
  });
});

describe("labels", () => {
  it("phone: until / ongoing / starts / ended; computer: ranges", () => {
    expect(dateLabel(row({ ends_at: iso(2026, 10, 26) }), NOW, false)).toEqual({ kind: "until", to: "26 Okt" });
    expect(dateLabel(row({}), NOW, false)).toEqual({ kind: "ongoing" });
    expect(dateLabel(row({ starts_at: iso(2026, 11, 1) }), NOW, false)).toEqual({ kind: "starts", from: "1 Nov" });
    expect(dateLabel(row({ starts_at: iso(2026, 10, 5), ends_at: iso(2026, 10, 12) }), NOW, false)).toEqual({ kind: "ended", to: "12 Okt" });
    expect(dateLabel(row({ starts_at: iso(2026, 10, 19), ends_at: iso(2026, 10, 22, 23, 59) }), NOW, true)).toEqual({ kind: "range", from: "19", to: "22 Okt" });
    expect(dateLabel(row({ starts_at: iso(2026, 10, 19) }), NOW, true, "en")).toEqual({ kind: "ongoing" });
    expect(dateLabel(row({ starts_at: iso(2026, 8, 3), ends_at: iso(2026, 8, 9) }), NOW, true, "en")).toEqual({ kind: "range", from: "3", to: "9 Aug" });
    expect(dateLabel(row({ starts_at: iso(2026, 10, 28), ends_at: iso(2026, 11, 3) }), NOW, true)).toEqual({ kind: "range", from: "28 Okt", to: "3 Nov" });
  });
  it("Kematian 'Tamat auto' days left", () => {
    expect(daysLeft(iso(2026, 10, 25, 10, 0), NOW)).toBe(3);
    expect(daysLeft(iso(2026, 10, 22, 11, 0), NOW)).toBe(1);
    expect(daysLeft(null, NOW)).toBeNull();
  });
  it("days and screens", () => {
    const short = (d: number) => ["", "Isn", "Sel", "Rab", "Kha", "Jum", "Sab", "Aha"][d];
    expect(daysLabel(null, short)).toBeNull();
    expect(daysLabel([1, 2, 3, 4, 5, 6, 7], short)).toBeNull();
    expect(daysLabel([5, 2], short)).toBe("Sel, Jum");
    expect(screensLabel(null, [])).toBeNull();
    expect(screensLabel(["s1", "gone"], [{ id: "s1", name: "Dewan Solat Utama" }])).toBe("Dewan Solat Utama");
  });
});

describe("switch and duplicate", () => {
  it("switch: shown ↔ paused; a draft is published", () => {
    expect(toggledStatus("published")).toBe("paused");
    expect(toggledStatus("paused")).toBe("published");
    expect(toggledStatus("draft")).toBe("published");
  });
  it("duplicate is a draft copy with the same content and schedule", () => {
    const r = row({ type: "poster", template_key: null, media_id: "m1", priority: true, screen_ids: ["s1"] });
    expect(duplicateRow(r, "org")).toMatchObject({ org_id: "org", type: "poster", media_id: "m1", status: "draft", priority: true, screen_ids: ["s1"], sort_order: r.sort_order });
    expect(duplicateRow(r, "org")).not.toHaveProperty("id");
  });
});