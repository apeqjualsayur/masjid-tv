import { describe, expect, it } from "vitest";
import { dayTimes } from "@/core/__fixtures__/sgr01-2026-10";
import { LABEL_MIN_GAP, MIN_SEGMENT, SEGMENT_GAP, TAIL_MS, labelAlign, labelRows, nowMarker, segments, spreadLabels, timelineWindow, timesOf, toPx, type Times } from "./geometry";

const MIN = 60_000;
const t = dayTimes(17).times as Times; // SGR01 Sat 17 Oct 2026: Imsak 5:40, Subuh 5:50, Syuruk 6:56, Zohor 1:01, Asar 4:18, Maghrib 7:01, Isyak 8:11
const w = timelineWindow(t)!;
const L = 1680;

describe("Garis Masa timeline geometry", () => {
  it("window = Imsak → Isyak + 72 min; null when a time is unknown", () => {
    expect(w).toEqual({ from: t.imsak, to: t.isyak + TAIL_MS });
    expect(timelineWindow({ ...t, isyak: NaN })).toBeNull();
  });

  it("segment widths are proportional to real duration, in order, with a small gap", () => {
    const segs = segments(t, w, L);
    expect(segs.map((s) => s.key)).toEqual(["imsak", "subuh", "syuruk", "zohor", "asar", "maghrib", "isyak"]);
    const pxPerMs = L / (w.to - w.from);
    const zohor = segs[3];
    expect(zohor.start).toBeCloseTo(toPx(t.zohor, w, L));
    expect(zohor.size).toBeCloseTo((t.asar - t.zohor) * pxPerMs - SEGMENT_GAP);
    expect(segs[2].size).toBeCloseTo((t.zohor - t.syuruk) * pxPerMs - SEGMENT_GAP); // one neutral Syuruk–Zohor segment
    expect(segs[6].size).toBeCloseTo(TAIL_MS * pxPerMs - SEGMENT_GAP); // Isyak to the end of the window
    expect(segs[0].start).toBe(0);
    expect(segs[6].start + segs[6].size + SEGMENT_GAP).toBeCloseTo(L);
  });

  it("very short segments keep a minimum size", () => {
    const tight = { ...t, subuh: t.imsak + MIN / 2 };
    expect(segments(tight, timelineWindow(tight)!, L)[0].size).toBe(MIN_SEGMENT);
  });

  it("now-marker clamps before Imsak and after the window", () => {
    expect(nowMarker(t.imsak - 60 * MIN, w, L)).toEqual({ pos: 0, clamped: "before" });
    expect(nowMarker(w.to + MIN, w, L)).toEqual({ pos: L, clamped: "after" });
    const mid = nowMarker(t.zohor, w, L);
    expect(mid.clamped).toBeNull();
    expect(mid.pos).toBeCloseTo(toPx(t.zohor, w, L));
  });

  it("labels closer than 140 px are staggered onto the second row", () => {
    const keys = ["subuh", "syuruk", "zohor", "asar", "maghrib", "isyak"] as const;
    const pos = keys.map((k) => toPx(t[k], w, L));
    // At 1680 px: Subuh–Syuruk ≈ 120 px and Maghrib–Isyak ≈ 127 px apart: both second labels drop a row.
    expect(pos[1] - pos[0]).toBeLessThan(LABEL_MIN_GAP);
    expect(labelRows(pos)).toEqual([0, 1, 0, 0, 0, 1]);
    expect(labelRows([0, 200, 400])).toEqual([0, 0, 0]);
    expect(labelRows([0, 10, 20])).toEqual([0, 1, 0]); // a third crowded label goes back to the farther row
  });

  it("a label that would run past the end is anchored on its right", () => {
    expect(labelAlign(1600, 140, 1680)).toBe("end");
    expect(labelAlign(1500, 140, 1680)).toBe("start");
  });

  it("after Isyak (tomorrow's Imsak and Subuh in the list) the bar still runs from today's Imsak", () => {
    const list = Object.entries(t).map(([key, at]) => ({ key: key as keyof Times, at: key === "imsak" || key === "subuh" ? at + 86_400_000 : at }));
    const tt = timesOf(list);
    expect(tt.imsak).toBe(t.imsak);
    expect(tt.subuh).toBe(t.subuh);
    expect(nowMarker(t.isyak + TAIL_MS + 30 * MIN, timelineWindow(tt)!, L)).toEqual({ pos: L, clamped: "after" });
  });

  it("vertical labels are spread at least minGap apart and stay inside the bar", () => {
    const ys = spreadLabels([10, 40, 300, 610, 620, 625], 64, 630);
    for (let i = 1; i < ys.length; i++) expect(ys[i] - ys[i - 1]).toBeGreaterThanOrEqual(64 - 1e-9);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...ys)).toBeLessThanOrEqual(630 - 64);
    expect(ys[2]).toBe(300); // a label with room stays on its anchor
  });
});
