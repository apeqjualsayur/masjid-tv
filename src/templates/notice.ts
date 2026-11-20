// Activity notices (Tangguh / Batal) on kuliah / program / mesyuarat, and the Penangguhan template's
// default end (PRD enhancements §3.1–3.3, §3.5). Pure: no React, no Supabase; times in epoch ms,
// calendar days in Malaysia time.
import { isDateKey, localToEpoch, parseClockBm, parseLocalDateTime } from "@/core";
import type { ActivityNoticeFields, TemplateKey } from "./types";

export type NoticeKind = "tangguh" | "batal";

/** Templates that can carry a notice (DB check slides_notice_shape). */
export const NOTICE_TEMPLATES: readonly TemplateKey[] = ["kuliah", "program", "mesyuarat"];
export const supportsNotice = (k: TemplateKey | null | undefined): boolean => !!k && NOTICE_TEMPLATES.includes(k);

export const REASON_MAX = 100;
/** Quick reasons offered in the sheet (§3.2). */
export const REASON_CHIPS = ["Penceramah uzur", "Cuaca tidak mengizinkan", "Hal yang tidak dapat dielakkan"] as const;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** The notice currently on a slide, or null. */
export function noticeOf(fields: Record<string, unknown>): ActivityNoticeFields | null {
  const n = fields.notice;
  if (!n || typeof n !== "object" || Array.isArray(n)) return null;
  const k = (n as { kind?: unknown }).kind;
  return k === "tangguh" || k === "batal" ? (n as ActivityNoticeFields) : null;
}

/** 23:59 on a Malaysia date ("end of day" for §3.3). */
export function endOfDay(dateIso: string): number | null {
  if (!isDateKey(dateIso)) return null;
  const [y, m, d] = dateIso.split("-").map(Number);
  return localToEpoch(y, m, d, 23, 59);
}

// ------------------------------------------------------------------ the sheet's input

/** What the Tangguh / Batal sheet collects. newAt = "YYYY-MM-DDTHH:MM" (Malaysia) or null = "akan dimaklumkan". */
export interface NoticeInput {
  kind: NoticeKind;
  newAt: string | null;
  reason: string;
}

export type NoticeErrors = Partial<Record<"newAt" | "reason", "required" | "invalid" | "past" | "tooLong">>;

/**
 * Tangguh with a date: a real date and time, in the future. `tba` = the "Tarikh baru akan dimaklumkan"
 * toggle (no date needed). Reason ≤ 100 characters (DB-enforced too).
 */
export function validateNotice(n: NoticeInput, tba: boolean, now: number): NoticeErrors {
  const e: NoticeErrors = {};
  if (n.kind === "tangguh" && !tba) {
    if (!n.newAt) e.newAt = "required";
    else {
      const ms = parseLocalDateTime(n.newAt);
      if (ms === null) e.newAt = "invalid";
      else if (ms <= now) e.newAt = "past";
    }
  }
  if ([...n.reason.trim()].length > REASON_MAX) e.reason = "tooLong";
  return e;
}

// ------------------------------------------------------------------ ends_at (§3.3)

export interface EndsAtInput {
  kind: NoticeKind;
  /** Tangguh: the new start (epoch ms), or null for "akan dimaklumkan". Ignored for Batal. */
  newAtMs: number | null;
  /** The activity's original date (fields.dateIso), when known. */
  eventDateIso: string | null | undefined;
  /** The slide's ends_at now; null = no end (runs until removed). */
  currentEndsAt: number | null;
  now: number;
}

export interface EndsAtResult {
  /** ends_at to save. */
  endsAt: number | null;
  /**
   * Batal only: the rule would end the slide earlier than it ends now (or it had no end). The admin is
   * asked "Tamatkan slaid selepas tarikh asal?" (default yes): yes → `endsAt`, no → keep the current.
   */
  shortens: boolean;
}

const later = (a: number | null, b: number): number | null => (a === null ? null : Math.max(a, b));

/**
 * | Tangguh with newAt | max(current, newAt + 3 h) |
 * | Tangguh, no date   | max(current, end of day of E, now + 24 h) |
 * | Batal              | max(end of day of E, now + 24 h); shortening a later end needs a yes |
 * "max" with a slide that has no end keeps it without an end.
 */
export function noticeEndsAt(i: EndsAtInput): EndsAtResult {
  const eod = i.eventDateIso ? endOfDay(i.eventDateIso) : null;
  const floor = Math.max(eod ?? -Infinity, i.now + DAY);
  if (i.kind === "tangguh") {
    const target = i.newAtMs !== null ? i.newAtMs + 3 * HOUR : floor;
    return { endsAt: later(i.currentEndsAt, target), shortens: false };
  }
  const shortens = i.currentEndsAt === null || i.currentEndsAt > floor;
  return { endsAt: floor, shortens };
}

/** The slide fields + columns a notice change writes. */
export interface NoticeRow {
  fields: Record<string, unknown>;
  priority: boolean;
  /** epoch ms; null = no end */
  endsAt: number | null;
}

/**
 * Set or update the notice (§3.2): priority on, the old priority kept in prevPriority (an update keeps
 * the first one), ends_at from noticeEndsAt (`keepEnd` = the admin said no to shortening).
 */
export function applyNotice(row: NoticeRow, input: NoticeInput, now: number, opts: { keepEnd?: boolean } = {}): NoticeRow {
  const prev = noticeOf(row.fields);
  const newAt = input.kind === "tangguh" ? input.newAt : null;
  const newAtMs = newAt ? parseLocalDateTime(newAt) : null;
  const r = noticeEndsAt({
    kind: input.kind,
    newAtMs,
    eventDateIso: typeof row.fields.dateIso === "string" ? row.fields.dateIso : null,
    currentEndsAt: row.endsAt,
    now,
  });
  const reason = input.reason.trim();
  const notice: ActivityNoticeFields = {
    kind: input.kind,
    newAt,
    reason: reason || null,
    setAt: new Date(now).toISOString(),
    prevPriority: prev?.prevPriority ?? row.priority,
  };
  return {
    fields: { ...row.fields, notice },
    priority: true,
    endsAt: r.shortens && opts.keepEnd ? row.endsAt : r.endsAt,
  };
}

/** Tarik balik (§3.2): notice removed, priority restored from prevPriority, ends_at kept. */
export function withdrawNotice(row: NoticeRow): NoticeRow {
  const prev = noticeOf(row.fields);
  const fields = { ...row.fields };
  delete fields.notice;
  return { fields, priority: prev ? prev.prevPriority === true : row.priority, endsAt: row.endsAt };
}

/** The sheet's starting values: the current notice (Kemas kini) or an empty one. */
export function noticeInputOf(fields: Record<string, unknown>, kind: NoticeKind): { input: NoticeInput; tba: boolean } {
  const n = noticeOf(fields);
  const same = n?.kind === kind ? n : null;
  return { input: { kind, newAt: same?.newAt ?? null, reason: same?.reason ?? "" }, tba: Boolean(same && kind === "tangguh" && !same.newAt) };
}

// ------------------------------------------------------------------ Penangguhan template (§3.5)

/**
 * Default ends_at for a new Penangguhan slide, by the same table: Tangguh with a new date → new
 * start + 3 h (a prayer-relative new time: end of that day); otherwise max(end of the original day,
 * now + 24 h).
 */
export function penangguhanEndsAt(fields: Record<string, unknown>, now: number): number {
  const floor = Math.max(endOfDay(String(fields.dateIso ?? "")) ?? -Infinity, now + DAY);
  if (fields.kind !== "batal" && isDateKey(fields.newDateIso)) {
    const clock = typeof fields.newTime === "string" ? parseClockBm(fields.newTime) : null;
    if (clock) {
      const ms = parseLocalDateTime(`${fields.newDateIso}T${clock}`);
      if (ms !== null) return ms + 3 * HOUR;
    }
    return endOfDay(fields.newDateIso)!;
  }
  return floor;
}

/** Penangguhan: the new date/time belong to Tangguh only; drop them for Batal before saving. */
export function cleanPenangguhan(fields: Record<string, unknown>): Record<string, unknown> {
  if (fields.kind !== "batal") return fields;
  const out = { ...fields };
  delete out.newDate;
  delete out.newDateIso;
  delete out.newTime;
  return out;
}

// ------------------------------------------------------------------ countdown fields (§4.1, §4.3)

export const DURATION_MIN = { min: 15, max: 600, default: 90 } as const;

/** durationMin, when given: a whole number of minutes 15–600. */
export function validateActivityExtras(fields: Record<string, unknown>): Record<string, { code: "range" | "number"; min?: number; max?: number }> {
  const d = fields.durationMin;
  if (d === undefined || d === null) return {};
  if (typeof d !== "number" || !Number.isInteger(d)) return { durationMin: { code: "number" } };
  if (d < DURATION_MIN.min || d > DURATION_MIN.max) return { durationMin: { code: "range", min: DURATION_MIN.min, max: DURATION_MIN.max } };
  return {};
}
