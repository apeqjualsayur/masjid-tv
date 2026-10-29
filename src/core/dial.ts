// Geometry for an analogue 12-hour dial (Falak theme, contract §6). Pure: Malaysia local time in,
// angles out (degrees clockwise from 12 o'clock). Themes draw; they never do this time maths.
import { localParts } from "./time";

/** Position of a moment on a 12-hour face: 0 at 12:00, 90 at 3:00. Seconds included. */
export function dialAngle(ms: number): number {
  const p = localParts(ms);
  return (((p.hour % 12) + p.minute / 60 + p.second / 3600) * 30) % 360;
}

/** Hand angles: hour and minute move smoothly, the second hand steps once a second. */
export function handAngles(ms: number): { hour: number; minute: number; second: number } {
  const p = localParts(ms);
  return {
    hour: (((p.hour % 12) + p.minute / 60) * 30) % 360,
    minute: ((p.minute + p.second / 60) * 6) % 360,
    second: p.second * 6,
  };
}

/** Clockwise sweep from `fromMs` to `toMs` on the dial, 0–360 (an arc longer than 12 h is clamped to a full turn). */
export function dialSweep(fromMs: number, toMs: number): number {
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs <= fromMs) return 0;
  if (toMs - fromMs >= 12 * 3_600_000) return 360;
  return (dialAngle(toMs) - dialAngle(fromMs) + 360) % 360;
}

/** True when `atMs` is after now and at most `hours` ahead: the waktu a 12-hour dial can show without overlap. */
export function withinNextHours(atMs: number, nowMs: number, hours = 12): boolean {
  return Number.isFinite(atMs) && atMs > nowMs && atMs - nowMs <= hours * 3_600_000;
}
