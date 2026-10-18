// Slide playlist for the poster area (bottom / side layouts). Pure and deterministic from the
// clock: the slide on screen is a function of the time, so it survives reloads and follows sim/speed.
import { localParts, localToEpoch, parseLocalDateTime } from "./time";

export const DEFAULT_SLIDE_SECONDS = 15;

export interface PlaylistItem<T> {
  id: string;
  /** Seconds on screen; default 15. */
  durationS?: number;
  /** Not shown before this. "2026-10-17", "2026-10-17T08:00" (Malaysia time) or ISO with offset. */
  startsAt?: string;
  /** Not shown from this moment. A date alone means "until the end of that day". */
  endsAt?: string;
  /** 0 = Ahad (Sunday) ... 6 = Sabtu. Missing or empty = every day. */
  daysOfWeek?: number[];
  /** Priority slides are shown twice as often. */
  priority?: boolean;
  sortOrder?: number;
  status?: "active" | "draft";
  payload: T;
}

export interface PlaylistState<T> {
  item: PlaylistItem<T>;
  /** 1-based position among the distinct eligible slides ("2 / 6"). */
  position: number;
  total: number;
  /** Epoch ms this showing started / ends. */
  startMs: number;
  endMs: number;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Parse a slide date. Date-only values are local days: start of day, or end of day when `endOfDay`. */
export function parseSlideTime(value: string, endOfDay = false): number | null {
  const v = value.trim();
  if (DATE_ONLY.test(v)) {
    const [y, m, d] = v.split("-").map(Number);
    const start = localToEpoch(y, m, d);
    if (localParts(start).day !== d) return null;
    return endOfDay ? localToEpoch(y, m, d + 1) : start;
  }
  const local = parseLocalDateTime(v);
  if (local !== null) return local;
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(v)) {
    const ms = Date.parse(v);
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
}

/** Shown at `at`? Active, started, not ended (end is exclusive), on an allowed weekday. Bad dates hide the slide. */
export function isEligible<T>(item: PlaylistItem<T>, at: number): boolean {
  if (item.status === "draft") return false;
  if (item.startsAt) {
    const s = parseSlideTime(item.startsAt);
    if (s === null || at < s) return false;
  }
  if (item.endsAt) {
    const e = parseSlideTime(item.endsAt, true);
    if (e === null || at >= e) return false;
  }
  if (item.daysOfWeek?.length && !item.daysOfWeek.includes(localParts(at).weekday)) return false;
  return true;
}

const byOrder = <T,>(a: PlaylistItem<T>, b: PlaylistItem<T>) =>
  (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id.localeCompare(b.id);

/**
 * One full cycle. Every slide once in order, plus a second showing of each priority slide spread
 * evenly through the cycle and never next to itself. If every slide is priority, none is doubled.
 */
export function buildCycle<T>(eligible: PlaylistItem<T>[]): PlaylistItem<T>[] {
  const base = [...eligible].sort(byOrder);
  const prio = base.filter((x) => x.priority);
  if (base.length < 2 || prio.length === 0 || prio.length === base.length) return base;

  const n = base.length;
  const queue = [...prio];
  const out: PlaylistItem<T>[] = [];
  let inserted = 0;
  for (let i = 0; i < n; i++) {
    out.push(base[i]);
    const target = Math.round(((i + 1) * prio.length) / n);
    while (inserted < target && queue.length) {
      const next = base[(i + 1) % n];
      const k = queue.findIndex((p) => p.id !== base[i].id && p.id !== next.id);
      if (k < 0) break; // would sit next to itself here; try a later slot
      out.push(queue.splice(k, 1)[0]);
      inserted++;
    }
  }
  // Anything still waiting goes into the first gap where neither neighbour is the same slide.
  for (const p of queue) {
    const j = out.findIndex((x, idx) => x.id !== p.id && out[(idx + 1) % out.length].id !== p.id);
    out.splice(j < 0 ? out.length : j + 1, 0, p);
  }
  return out;
}

const durationMs = <T,>(x: PlaylistItem<T>) =>
  Math.max(1, x.durationS && Number.isFinite(x.durationS) ? x.durationS : DEFAULT_SLIDE_SECONDS) * 1000;

/** The slide to show at `at`, or null when nothing is eligible. */
export function playlistAt<T>(items: PlaylistItem<T>[], at: number): PlaylistState<T> | null {
  const eligible = items.filter((x) => isEligible(x, at));
  if (!eligible.length) return null;
  const cycle = buildCycle(eligible);
  const distinct = [...eligible].sort(byOrder);

  const total = cycle.reduce((sum, x) => sum + durationMs(x), 0);
  const cycleStart = at - (((at % total) + total) % total);
  let t = cycleStart;
  for (const item of cycle) {
    const end = t + durationMs(item);
    if (at < end) {
      return { item, position: distinct.findIndex((d) => d.id === item.id) + 1, total: distinct.length, startMs: t, endMs: end };
    }
    t = end;
  }
  // Unreachable: `at` always falls inside the cycle.
  const last = cycle[cycle.length - 1];
  return { item: last, position: distinct.length, total: distinct.length, startMs: t - durationMs(last), endMs: t };
}