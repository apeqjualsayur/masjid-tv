import { describe, expect, it } from "vitest";
import { DEFAULT_SLIDE_SECONDS, buildCycle, isEligible, parseSlideTime, playlistAt, type PlaylistItem } from "./playlist";
import { localToEpoch, parseLocalDateTime } from "./time";

const at = (s: string) => parseLocalDateTime(s)!;
const item = (id: string, extra: Partial<PlaylistItem<string>> = {}): PlaylistItem<string> => ({ id, payload: id, ...extra });
const ids = (xs: PlaylistItem<string>[]) => xs.map((x) => x.id);

describe("slide dates", () => {
  it("date-only is a local day; ends_at covers the whole day", () => {
    expect(parseSlideTime("2026-10-17")).toBe(localToEpoch(2026, 10, 17));
    expect(parseSlideTime("2026-10-17", true)).toBe(localToEpoch(2026, 10, 18));
    expect(parseSlideTime("2026-10-17T08:30")).toBe(localToEpoch(2026, 10, 17, 8, 30));
    expect(parseSlideTime("2026-10-17T00:30:00Z")).toBe(Date.UTC(2026, 9, 17, 0, 30));
    expect(parseSlideTime("2026-10-17T08:30:00+08:00")).toBe(localToEpoch(2026, 10, 17, 8, 30));
    expect(parseSlideTime("17/10/2026")).toBeNull();
    expect(parseSlideTime("2026-02-31")).toBeNull();
  });
});

describe("eligibility", () => {
  const now = at("2026-10-17T10:00:00"); // Saturday

  it("skips expired slides (ends_at exclusive) and not-yet-started ones", () => {
    expect(isEligible(item("a", { endsAt: "2026-10-16" }), now)).toBe(false);
    expect(isEligible(item("a", { endsAt: "2026-10-17" }), now)).toBe(true); // until end of today
    expect(isEligible(item("a", { endsAt: "2026-10-17T10:00" }), now)).toBe(false);
    expect(isEligible(item("a", { endsAt: "2026-10-17T10:00:01" }), now)).toBe(true);
    expect(isEligible(item("a", { startsAt: "2026-10-18" }), now)).toBe(false);
    expect(isEligible(item("a", { startsAt: "2026-10-17T10:00" }), now)).toBe(true);
  });

  it("respects days_of_week in Malaysia time (0 = Ahad ... 6 = Sabtu)", () => {
    expect(isEligible(item("a", { daysOfWeek: [6] }), now)).toBe(true);
    expect(isEligible(item("a", { daysOfWeek: [5] }), now)).toBe(false);
    expect(isEligible(item("a", { daysOfWeek: [] }), now)).toBe(true);
    // 23:30 Friday UTC is already Saturday in Malaysia
    expect(isEligible(item("a", { daysOfWeek: [6] }), Date.UTC(2026, 9, 16, 16, 30))).toBe(true);
  });

  it("drafts and unparseable dates are hidden", () => {
    expect(isEligible(item("a", { status: "draft" }), now)).toBe(false);
    expect(isEligible(item("a", { endsAt: "soon" }), now)).toBe(false);
  });
});

describe("cycle order and priority", () => {
  it("orders by sort_order, then id", () => {
    expect(ids(buildCycle([item("b", { sortOrder: 2 }), item("a", { sortOrder: 2 }), item("z", { sortOrder: 1 })]))).toEqual(["z", "a", "b"]);
  });

  it("priority slides appear twice per cycle, never back to back (including the wrap)", () => {
    const cases = [
      [item("A", { sortOrder: 1, priority: true }), item("B", { sortOrder: 2 }), item("C", { sortOrder: 3 })],
      [item("A", { sortOrder: 1 }), item("B", { sortOrder: 2 }), item("C", { sortOrder: 3, priority: true })],
      [item("A", { sortOrder: 1, priority: true }), item("B", { sortOrder: 2, priority: true }), item("C", { sortOrder: 3 }), item("D", { sortOrder: 4 }), item("E", { sortOrder: 5 })],
      [item("A", { sortOrder: 1, priority: true }), item("B", { sortOrder: 2 })],
    ];
    for (const list of cases) {
      const cycle = ids(buildCycle(list));
      for (const x of list) expect(cycle.filter((id) => id === x.id)).toHaveLength(x.priority ? 2 : 1);
      // With only two slides a doubled one must meet itself at the wrap (A B A), so check from three.
      if (list.length >= 3) {
        for (let i = 0; i < cycle.length; i++) expect(cycle[i]).not.toBe(cycle[(i + 1) % cycle.length]);
      }
    }
  });

  it("all-priority or a single slide: shown once", () => {
    expect(ids(buildCycle([item("A", { priority: true }), item("B", { priority: true })]))).toEqual(["A", "B"]);
    expect(ids(buildCycle([item("A", { priority: true })]))).toEqual(["A"]);
  });

  it("over a long run a priority slide gets twice the screen time", () => {
    const list = [item("A", { sortOrder: 1, priority: true }), item("B", { sortOrder: 2 }), item("C", { sortOrder: 3 })];
    const counts: Record<string, number> = { A: 0, B: 0, C: 0 };
    const start = at("2026-10-17T10:00:00");
    for (let t = start; t < start + 3600_000; t += 1000) counts[playlistAt(list, t)!.item.id]++;
    expect(counts.A / counts.B).toBeCloseTo(2, 1);
    expect(counts.B).toBe(counts.C);
  });
});

describe("timing", () => {
  const list = [item("A", { sortOrder: 1 }), item("B", { sortOrder: 2, durationS: 20 }), item("C", { sortOrder: 3 })];

  it("default 15 s, per-slide duration, then wraps", () => {
    expect(DEFAULT_SLIDE_SECONDS).toBe(15);
    const total = 15 + 20 + 15;
    const base = Math.ceil(at("2026-10-17T10:00:00") / (total * 1000)) * total * 1000; // a cycle boundary
    const seq = [0, 14_999, 15_000, 34_999, 35_000, 49_999, 50_000].map((d) => playlistAt(list, base + d)!.item.id);
    expect(seq).toEqual(["A", "A", "B", "B", "C", "C", "A"]);
    expect(playlistAt(list, base + 20_000)).toMatchObject({ startMs: base + 15_000, endMs: base + 35_000 });
  });

  it("counter counts distinct slides (2 / 3), even with priority repeats", () => {
    const base = Math.ceil(at("2026-10-17T10:00:00") / 50_000) * 50_000;
    expect(playlistAt(list, base + 16_000)).toMatchObject({ position: 2, total: 3 });
    const prio = [item("A", { sortOrder: 1, priority: true }), item("B", { sortOrder: 2 }), item("C", { sortOrder: 3 })];
    const seen = new Set<string>();
    for (let t = base; t < base + 120_000; t += 1000) {
      const p = playlistAt(prio, t)!;
      expect(p.total).toBe(3);
      seen.add(`${p.item.id}:${p.position}`);
    }
    expect([...seen].sort()).toEqual(["A:1", "B:2", "C:3"]);
  });

  it("nothing eligible gives null; an expired slide drops out of rotation", () => {
    const now = at("2026-10-17T10:00:00");
    expect(playlistAt([], now)).toBeNull();
    expect(playlistAt([item("old", { endsAt: "2026-01-01" })], now)).toBeNull();
    const mixed = [item("old", { endsAt: "2026-01-01" }), item("A"), item("B")];
    for (let t = now; t < now + 120_000; t += 5000) expect(playlistAt(mixed, t)!.item.id).not.toBe("old");
    expect(playlistAt(mixed, now)!.total).toBe(2);
  });
});