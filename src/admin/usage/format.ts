// Number and date formatting for the Penggunaan tab (designs/admin/D-Usage.html). Pure: no React.
import type { Unit } from "./model";

const MYT = "Asia/Kuala_Lumpur";
const num = (v: number, digits: number, locale: string) =>
  v.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** Decimal like Supabase's usage page: "2.04 GB", "12 GB", "41.6 MB", "286 MB". */
export function fmtBytes(b: number, locale: string): string {
  const v = Math.max(0, b || 0);
  if (v >= 1e9) return `${num(v / 1e9, v >= 1e10 ? 0 : 2, locale)} GB`;
  return `${num(v / 1e6, v >= 1e8 ? 0 : 1, locale)} MB`;
}

/** A metric value in its unit: bytes, "0.97 /s" or a whole count. */
export function fmtValue(v: number, unit: Unit, locale: string): string {
  if (unit === "bytes") return fmtBytes(v, locale);
  if (unit === "rps") return `${num(v, 2, locale)} /s`;
  return Math.round(v).toLocaleString(locale);
}

/** "0.4" below 1 %, otherwise whole: "74". */
export const fmtPct = (p: number, locale: string) => (p > 0 && p < 1 ? num(p, 1, locale) : Math.round(p).toLocaleString(locale));

const ymdDate = (ymd: string) => new Date(`${ymd.slice(0, 10)}T00:00:00Z`);

/** "Jun 2027" from 'YYYY-MM-DD'. */
export const fmtMonthYear = (ymd: string, locale: string) =>
  ymdDate(ymd).toLocaleDateString(locale, { month: "short", year: "numeric", timeZone: "UTC" });

/** "1 Okt" from 'YYYY-MM-DD'. */
export const fmtDayMonth = (ymd: string, locale: string) =>
  ymdDate(ymd).toLocaleDateString(locale, { day: "numeric", month: "short", timeZone: "UTC" });

/** "20 Oktober 2026" from 'YYYY-MM-DD'. */
export const fmtLongDate = (ymd: string, locale: string) =>
  ymdDate(ymd).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** Last day of the cycle: the day before the exclusive end date. */
export const cycleLastDay = (endExclusive: string) => new Date(ymdDate(endExclusive).getTime() - 86_400_000).toISOString().slice(0, 10);

/** "10:00" in Malaysian time. */
export const fmtTime = (iso: string, locale: string) =>
  new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: MYT });
