// Strict checks for prayer data read from IndexedDB or the bundled fallback.
// Anything that fails is treated as missing: we never show doubtful times.
import { WAKTU_ORDER, localDateKey, type DayTimes } from "@/core";
import type { MonthData } from "./types";

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function dateKeyOf(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Each time is a finite epoch ms on its own local date, and the 7 are in order. */
export function isValidDay(d: unknown, dateKey: string): d is DayTimes {
  if (!d || typeof d !== "object") return false;
  const day = d as DayTimes;
  if (day.date !== dateKey || typeof day.hijri !== "string" || !day.times || typeof day.times !== "object") return false;
  let prev = -Infinity;
  for (const k of WAKTU_ORDER) {
    const t = day.times[k];
    if (typeof t !== "number" || !Number.isFinite(t) || t <= prev) return false;
    if (localDateKey(t) !== dateKey) return false;
    prev = t;
  }
  return true;
}

export function isValidMonth(m: unknown, zone: string, year: number, month: number): m is MonthData {
  if (!m || typeof m !== "object") return false;
  const md = m as MonthData;
  if (md.zone !== zone || md.year !== year || md.month !== month || !Array.isArray(md.days)) return false;
  if (md.days.length !== daysInMonth(year, month)) return false;
  return md.days.every((d, i) => isValidDay(d, dateKeyOf(year, month, i + 1)));
}
