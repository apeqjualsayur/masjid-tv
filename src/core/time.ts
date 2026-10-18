// The single source of "now" for the whole app (PRD §9.3, §10), plus Malaysia-local
// date helpers. Malaysia is UTC+8 with no DST, so local time is computed from a fixed
// offset; this keeps results identical whatever timezone the TV or test machine uses.

export const MY_UTC_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface LocalParts {
  year: number;
  /** 1–12 */
  month: number;
  day: number;
  /** 0 = Ahad (Sunday) … 6 = Sabtu (Saturday) */
  weekday: number;
  hour: number;
  minute: number;
  second: number;
}

export function localParts(ms: number): LocalParts {
  const d = new Date(ms + MY_UTC_OFFSET_MS);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    weekday: d.getUTCDay(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    second: d.getUTCSeconds(),
  };
}

/** Epoch ms for a Malaysia-local wall-clock time. */
export function localToEpoch(year: number, month: number, day: number, hour = 0, minute = 0, second = 0): number {
  return Date.UTC(year, month - 1, day, hour, minute, second) - MY_UTC_OFFSET_MS;
}

/** Local date key "YYYY-MM-DD". */
export function localDateKey(ms: number): string {
  const p = localParts(ms);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
}

/** Day of week (0 = Sunday) for a local date key "YYYY-MM-DD". */
export function weekdayOfDateKey(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** The local date key one day after the given one. */
export function nextDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return localDateKey(localToEpoch(y, m, d, 12) + DAY_MS);
}

/**
 * Parse the `sim` debug param, a Malaysia-local time without zone:
 * "2026-10-17T13:04:30" or "2026-10-17T13:04". Returns null if invalid.
 */
export function parseLocalDateTime(value: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!m) return null;
  const [y, mo, d, h, mi, s] = m.slice(1).map((x) => (x === undefined ? 0 : Number(x)));
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59 || s > 59) return null;
  const ms = localToEpoch(y, mo, d, h, mi, s);
  // Reject dates that rolled over (e.g. 31 Feb).
  return localParts(ms).day === d ? ms : null;
}

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

// ---------------------------------------------------------------------------
// Clock

export interface DebugTime {
  /** Pretend the clock reads this (epoch ms) at the moment the override is applied. */
  simStartMs?: number | null;
  /** Clock speed multiplier, e.g. 10 = ten times faster. */
  speed?: number;
}

export interface Clock {
  /** Offset-corrected (or simulated) current time. */
  now(): Date;
  nowMs(): number;
  /** offset = serverTime − device time, in ms (PRD §9.3). Ignored while simulating. */
  setOffset(ms: number): void;
  getOffset(): number;
  /** Apply or clear (`null`) the debug sim/speed override (PRD §10). */
  setDebugTime(debug: DebugTime | null): void;
}

export function createClock(realNow: () => number = () => Date.now()): Clock {
  let offsetMs = 0;
  let debug: { anchorReal: number; anchorSim: number; speed: number } | null = null;

  const nowMs = () => {
    const real = realNow();
    if (!debug) return real + offsetMs;
    return debug.anchorSim + (real - debug.anchorReal) * debug.speed;
  };

  return {
    nowMs,
    now: () => new Date(nowMs()),
    setOffset(ms) {
      offsetMs = Number.isFinite(ms) ? ms : 0;
    },
    getOffset: () => offsetMs,
    setDebugTime(d) {
      if (!d || (d.simStartMs == null && (d.speed == null || d.speed === 1))) {
        debug = null;
        return;
      }
      const speed = d.speed != null && Number.isFinite(d.speed) && d.speed > 0 ? d.speed : 1;
      const real = realNow();
      debug = { anchorReal: real, anchorSim: d.simStartMs ?? real + offsetMs, speed };
    },
  };
}

const appClock = createClock();

/** The app-wide current time. Every time read in the app goes through this. */
export const now = (): Date => appClock.now();
export const nowMs = (): number => appClock.nowMs();
export const setClockOffset = (ms: number): void => appClock.setOffset(ms);
export const getClockOffset = (): number => appClock.getOffset();
export const setDebugTime = (debug: DebugTime | null): void => appClock.setDebugTime(debug);
