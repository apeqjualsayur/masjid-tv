import { describe, expect, it } from "vitest";
import { localToEpoch } from "@/core";
import { dbDaysToPlaylist, durationParts, isOnline, liveSlides, offlineFor, targetCount, type SlideRow } from "./logic";

const now = localToEpoch(2026, 10, 20, 10, 0, 0); // Selasa (Tuesday) 10:00 MYT
const iso = (ms: number) => new Date(ms).toISOString();
const slide = (id: string, extra: Partial<SlideRow> = {}): SlideRow => ({
  id, type: "template", template_key: "kuliah", fields: {}, status: "published", starts_at: iso(now - 3600_000), ends_at: null,
  duration_s: 15, days_of_week: null, priority: false, sort_order: 0, screen_ids: null, ...extra,
});

describe("screen online status", () => {
  it("online when seen within 3 minutes", () => {
    expect(isOnline(iso(now - 60_000), now)).toBe(true);
    expect(isOnline(iso(now - 180_000), now)).toBe(true);
    expect(isOnline(iso(now - 181_000), now)).toBe(false);
    expect(isOnline(null, now)).toBe(false);
  });
  it("offline duration", () => {
    expect(offlineFor(iso(now - 3 * 3600_000), now)).toBe(3 * 3600_000);
    expect(offlineFor(null, now)).toBeNull();
  });
});

describe("weekday conversion", () => {
  it("DB 1 = Isnin … 7 = Ahad → playlist 0 = Ahad … 6 = Sabtu", () => {
    expect(dbDaysToPlaylist([1, 2, 3, 4, 5, 6, 7])).toEqual([1, 2, 3, 4, 5, 6, 0]);
    expect(dbDaysToPlaylist(null)).toBeUndefined();
    expect(dbDaysToPlaylist([])).toBeUndefined();
  });
});

describe("Sedang dipapar", () => {
  it("only published slides that are showing now, in order", () => {
    const rows = [
      slide("b", { sort_order: 2 }),
      slide("a", { sort_order: 1 }),
      slide("draft", { status: "draft" }),
      slide("paused", { status: "paused" }),
      slide("ended", { ends_at: iso(now - 1000) }),
      slide("later", { starts_at: iso(now + 3600_000) }),
      slide("tuesday", { days_of_week: [2] }), // Selasa
      slide("friday", { days_of_week: [5] }), // Jumaat
      slide("sunday", { days_of_week: [7] }), // Ahad
    ];
    expect(liveSlides(rows, now).map((s) => s.id)).toEqual(["tuesday", "a", "b"]); // tuesday has sort_order 0
  });
});

describe("helpers", () => {
  it("durationParts", () => {
    expect(durationParts((2 * 60 + 51) * 60_000)).toEqual({ d: 0, h: 2, m: 51 });
    expect(durationParts(3 * 86_400_000 + 5 * 60_000)).toEqual({ d: 3, h: 0, m: 5 });
    expect(durationParts(30_000)).toEqual({ d: 0, h: 0, m: 1 });
  });
  it("targetCount ignores screens that no longer exist", () => {
    expect(targetCount({ screen_ids: null }, [{ id: "x" }])).toBe("all");
    expect(targetCount({ screen_ids: ["x", "gone"] }, [{ id: "x" }, { id: "y" }])).toBe(1);
  });
});