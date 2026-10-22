// Slide schedule (PRD Phase 2 §4.5 "Schedule fields"), shared by posters (2.8) and templates (2.9).
// Times are entered and shown in Malaysia time (UTC+8) and stored as timestamptz. Pure.
import { localParts, localToEpoch, pad2 } from "@/core";

export const DURATION = { min: 5, max: 120, default: 15 } as const;
/** Database weekdays: 1 = Isnin … 7 = Ahad. */
export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

export interface Schedule {
  startDate: string; // YYYY-MM-DD (Malaysia)
  startTime: string; // HH:MM
  hasEnd: boolean;
  endDate: string;
  endTime: string;
  durationS: number;
  /** Database weekdays; empty = every day. */
  days: number[];
  priority: boolean;
  /** null = all screens. */
  screenIds: string[] | null;
}

export interface ScheduleRules {
  /** Kematian: an end date is required … */
  endRequired?: boolean;
  /** … and at most this many days after the start (DB-enforced: 7). */
  maxDays?: number;
}

export interface SlideScheduleRow {
  starts_at: string;
  ends_at: string | null;
  duration_s: number;
  days_of_week: number[] | null;
  priority: boolean;
  screen_ids: string[] | null;
}

const dateOf = (ms: number) => {
  const p = localParts(ms);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
};
const timeOf = (ms: number) => {
  const p = localParts(ms);
  return `${pad2(p.hour)}:${pad2(p.minute)}`;
};

/** Epoch ms of a Malaysia date + time, or null when not a real date/time. */
export function toEpoch(date: string, time: string): number | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^(\d{2}):(\d{2})$/.exec(time);
  if (!d || !t) return null;
  const [y, m, day] = d.slice(1).map(Number);
  const [h, min] = t.slice(1).map(Number);
  if (m < 1 || m > 12 || day < 1 || day > 31 || h > 23 || min > 59) return null;
  const ms = localToEpoch(y, m, day, h, min);
  return localParts(ms).day === day ? ms : null;
}

/** New slide: starts now, no end, 15 s, every day, all screens. Kematian rules: ends in 3 days. */
export function defaultSchedule(now: number, rules: ScheduleRules = {}): Schedule {
  const end = now + 3 * 86_400_000;
  return {
    startDate: dateOf(now),
    startTime: timeOf(now),
    hasEnd: Boolean(rules.endRequired),
    endDate: dateOf(end),
    endTime: "23:59",
    durationS: DURATION.default,
    days: [],
    priority: false,
    screenIds: null,
  };
}

export function scheduleFromRow(r: SlideScheduleRow, now: number): Schedule {
  const start = Date.parse(r.starts_at);
  const end = r.ends_at ? Date.parse(r.ends_at) : NaN;
  const base = defaultSchedule(Number.isFinite(start) ? start : now);
  return {
    ...base,
    hasEnd: Number.isFinite(end),
    endDate: Number.isFinite(end) ? dateOf(end) : base.endDate,
    endTime: Number.isFinite(end) ? timeOf(end) : base.endTime,
    durationS: r.duration_s,
    days: r.days_of_week ?? [],
    priority: r.priority,
    screenIds: r.screen_ids,
  };
}

/** Field → i18n key of its problem. */
export type ScheduleErrors = Partial<Record<"start" | "end" | "duration" | "screens", string>>;

export function validateSchedule(s: Schedule, rules: ScheduleRules = {}): ScheduleErrors {
  const e: ScheduleErrors = {};
  const start = toEpoch(s.startDate, s.startTime);
  if (start === null) e.start = "schedule.err.start";
  if (rules.endRequired && !s.hasEnd) e.end = "schedule.err.endRequired";
  if (s.hasEnd) {
    const end = toEpoch(s.endDate, s.endTime);
    if (end === null) e.end = "schedule.err.end";
    else if (start !== null && end <= start) e.end = "schedule.err.endBeforeStart";
    else if (start !== null && rules.maxDays && end - start > rules.maxDays * 86_400_000) e.end = "schedule.err.endTooLate";
  }
  if (!Number.isInteger(s.durationS) || s.durationS < DURATION.min || s.durationS > DURATION.max) e.duration = "schedule.err.duration";
  if (s.screenIds !== null && s.screenIds.length === 0) e.screens = "schedule.err.screens";
  return e;
}

const iso = (ms: number) => new Date(ms).toISOString();

/** Columns for the slides table (validate first). Every weekday selected = every day (null). */
export function scheduleToRow(s: Schedule): SlideScheduleRow {
  const start = toEpoch(s.startDate, s.startTime)!;
  const end = s.hasEnd ? toEpoch(s.endDate, s.endTime) : null;
  const days = [...new Set(s.days)].filter((d) => d >= 1 && d <= 7).sort((a, b) => a - b);
  return {
    starts_at: iso(start),
    ends_at: end === null ? null : iso(end),
    duration_s: s.durationS,
    days_of_week: days.length === 0 || days.length === 7 ? null : days,
    priority: s.priority,
    screen_ids: s.screenIds && s.screenIds.length ? [...s.screenIds] : null,
  };
}
/** Same schedule a number of days later ("Duplikasi untuk minggu depan"). */
export function shiftSchedule(s: Schedule, days: number): Schedule {
  const add = (date: string) => {
    const ms = toEpoch(date, "12:00");
    return ms === null ? date : dateOf(ms + days * 86_400_000);
  };
  return { ...s, startDate: add(s.startDate), endDate: add(s.endDate) };
}
