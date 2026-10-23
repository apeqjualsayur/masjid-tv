// Friday info strip (PRD §5.1): estimated Solat Jumaat times from the Zohor time and the masjid's
// durations. Pure: no styling, no React. Themes only render the result (theme contract rule 12).
import { formatTime } from "./format";
import { withDurationDefaults, type ModeDurations } from "./modes";
import { isFridayDate } from "./schedule";
import { localToEpoch } from "./time";
import type { DayTimes } from "./types";

export interface FridayInfo {
  /** "1:05" */
  azan: string;
  /** "1:08" */
  khutbahStart: string;
  /** 40 */
  khutbahMin: number;
  /** "1:48" (estimate) */
  solatStart: string;
  /** "2:00" (estimate) */
  solatEnd: string;
  /** For the khutbah screen ("Dijangka tamat ±…"). */
  khutbahEnd: Date;
}

/** Strip label (theme contract rule 12); TV text, always BM. */
export const FRIDAY_LABEL = "SOLAT JUMAAT";

/** The three parts of the strip text; a line may only break between them. */
export function fridayParts(f: FridayInfo): [string, string, string] {
  return [`Azan ${f.azan}`, `Khutbah ${f.khutbahStart} (±${f.khutbahMin} minit)`, `Solat ±${f.solatStart}`];
}

/** "Azan 1:05 · Khutbah 1:08 (±40 minit) · Solat ±1:48" */
export function fridayDetails(f: FridayInfo): string {
  return fridayParts(f).join(" · ");
}

const MIN = 60_000;
const roundMin = (ms: number) => Math.round(ms / MIN) * MIN;

/** Epoch ms when Solat Jumaat is expected to end (Zohor + azan + khutbah + Solat Jumaat). */
export function jumaatEndsAt(day: DayTimes, durations: Partial<ModeDurations>): number {
  const d = withDurationDefaults(durations);
  return day.times.zohor + (Math.max(0, d.azanMin) + Math.max(0, d.khutbahMin) + Math.max(0, d.jumaatSolatMin)) * MIN;
}

/**
 * The strip data, or undefined: only on Friday, only if showFridayInfo, only from 00:00 that day
 * until Solat Jumaat ends. Times use the prayer list's formatter (12h without AM/PM unless clock24h),
 * rounded to the minute. `isFriday` overrides the date (debug `day=fri`).
 */
export function fridayInfo(day: DayTimes, durations: Partial<ModeDurations>, now: number, clock24h: boolean, isFriday?: boolean): FridayInfo | undefined {
  const d = withDurationDefaults(durations);
  if (!d.showFridayInfo) return undefined;
  if (!(isFriday ?? isFridayDate(day.date))) return undefined;
  const zohor = day.times.zohor;
  if (!Number.isFinite(zohor)) return undefined;
  const [y, m, dd] = day.date.split("-").map(Number);
  const startOfDay = localToEpoch(y, m, dd, 0, 0, 0);
  const khutbahStart = zohor + Math.max(0, d.azanMin) * MIN;
  const solatStart = khutbahStart + Math.max(0, d.khutbahMin) * MIN;
  const solatEnd = solatStart + Math.max(0, d.jumaatSolatMin) * MIN;
  if (now < startOfDay || now >= solatEnd) return undefined;
  const f = (ms: number) => formatTime(roundMin(ms), clock24h);
  return {
    azan: f(zohor),
    khutbahStart: f(khutbahStart),
    khutbahMin: d.khutbahMin,
    solatStart: f(solatStart),
    solatEnd: f(solatEnd),
    khutbahEnd: new Date(roundMin(solatStart)),
  };
}
