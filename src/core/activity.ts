// Activity countdown for kuliah / program / mesyuarat slides (_specs/60-PRD-enhancements.md §4, D10).
// Pure: the caller passes the time (from now()). Calendar days are Malaysia days.
import { formatTime } from "./format";
import { localDateKey, localParts, localToEpoch, pad2, parseLocalDateTime } from "./time";

const DAY_MS = 86_400_000;
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** "20:30" → "8:30 malam" (Malaysian usage; the admin editor writes this text into `time`). */
export function formatClockBm(hhmm: string): string {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return "";
  const h = Number(m[1]);
  const part = h < 12 ? "pagi" : h < 14 ? "tengah hari" : h < 19 ? "petang" : "malam";
  return `${h % 12 || 12}:${m[2]} ${part}`;
}

/** "8:30 malam" → "20:30"; null for anything else (e.g. "Selepas Maghrib"). */
export function parseClockBm(text: string): string | null {
  const m = /^(\d{1,2}):(\d{2}) (pagi|tengah hari|petang|malam)$/.exec(text.trim());
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (m[3] !== "pagi") h += 12;
  if (m[3] === "tengah hari" && Number(m[1]) === 12) h = 12;
  if (m[3] === "pagi" && Number(m[1]) === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

/** Whole calendar days from local date key `a` to `b` (b − a). NaN when either is not a valid date. */
export function daysBetween(a: string, b: string): number {
  const p = DATE_ONLY.exec(a);
  const q = DATE_ONLY.exec(b);
  if (!p || !q) return NaN;
  return Math.round((Date.UTC(+q[1], +q[2] - 1, +q[3]) - Date.UTC(+p[1], +p[2] - 1, +p[3])) / DAY_MS);
}

/** A real calendar date "YYYY-MM-DD" (rejects 2026-02-31). */
export function isDateKey(v: unknown): v is string {
  if (typeof v !== "string") return false;
  const m = DATE_ONLY.exec(v);
  if (!m) return false;
  return localDateKey(localToEpoch(+m[1], +m[2], +m[3], 12)) === v;
}

/** When an activity happens: a Malaysia date, and an exact clock time or a prayer-relative text. */
export interface EventAt {
  dateIso: string;
  /** Epoch ms of an exact start ("8:30 malam", or a notice's newAt). Null for "Selepas Maghrib" etc. */
  atMs: number | null;
  /** The `time` text as entered ("Selepas Maghrib", "8:30 malam"); "" when none. */
  label: string;
}

/** Event time of a kuliah / program / mesyuarat slide = `dateIso` + `time` (§4.1). No dateIso → null. */
export function activityEventAt(fields: Record<string, unknown>): EventAt | null {
  const dateIso = fields.dateIso;
  if (!isDateKey(dateIso)) return null;
  const label = typeof fields.time === "string" ? fields.time.trim() : "";
  const clock = parseClockBm(label);
  let atMs: number | null = null;
  if (clock) {
    const [y, m, d] = dateIso.split("-").map(Number);
    const [h, mi] = clock.split(":").map(Number);
    atMs = localToEpoch(y, m, d, h, mi);
  }
  return { dateIso, atMs, label };
}

export interface ActivityNotice {
  kind: "tangguh" | "batal";
  /** "2026-11-28T20:45" (Malaysia time) or null = "Tarikh baru akan dimaklumkan". */
  newAt: string | null;
  reason: string | null;
}

/** fields.notice → a notice, or null when absent or not a valid shape. */
export function activityNotice(fields: Record<string, unknown>): ActivityNotice | null {
  const n = fields.notice;
  if (!n || typeof n !== "object" || Array.isArray(n)) return null;
  const o = n as Record<string, unknown>;
  if (o.kind !== "tangguh" && o.kind !== "batal") return null;
  const newAt = o.kind === "tangguh" && typeof o.newAt === "string" && parseLocalDateTime(o.newAt) !== null ? o.newAt : null;
  const reason = typeof o.reason === "string" && o.reason.trim() ? o.reason.trim() : null;
  return { kind: o.kind, newAt, reason };
}

/** A notice's new date as an event time (always exact, D10). */
export function noticeEventAt(n: ActivityNotice | null): EventAt | null {
  if (!n?.newAt) return null;
  const ms = parseLocalDateTime(n.newAt);
  if (ms === null) return null;
  return { dateIso: localDateKey(ms), atMs: ms, label: "" };
}

export type ActivityCountdown =
  | { kind: "none" }
  /** "Lagi 3 hari" */
  | { kind: "days"; days: number }
  /** "Esok · 8:45 malam" / "Esok · Selepas Maghrib" (`time` may be "" when no time was entered) */
  | { kind: "tomorrow"; time: string }
  /** "Hari ini · 8:45 malam" */
  | { kind: "today"; time: string }
  /** "Bermula dalam 42:15": exact start ≤ 60 min away; `text` is mm:ss */
  | { kind: "minutes"; mm: number; ss: number; text: string }
  /** "Sedang berlangsung" */
  | { kind: "ongoing" };

export const DEFAULT_ACTIVITY_MINUTES = 90;

/** Clock text for the day-level lines: 12h → "8:45 malam" (as written by the admin), 24h → "20:45". */
function timeText(ev: EventAt, clock24h: boolean): string {
  if (ev.atMs === null) return ev.label;
  if (clock24h) return formatTime(ev.atMs, true);
  const p = localParts(ev.atMs);
  return formatClockBm(`${pad2(p.hour)}:${pad2(p.minute)}`);
}

/**
 * Countdown line state (§4.2). With a Tangguh notice that has newAt, the target is newAt; Tangguh
 * without a date and Batal → none (§3.4). A prayer-relative time gives day-level states only (D10).
 */
export function activityCountdown(
  eventAt: EventAt | null,
  durationMin: number | null | undefined,
  now: number,
  notice: ActivityNotice | null = null,
  clock24h = false,
): ActivityCountdown {
  if (notice) {
    if (notice.kind === "batal" || !notice.newAt) return { kind: "none" };
    eventAt = noticeEventAt(notice);
  }
  if (!eventAt) return { kind: "none" };
  const dur = typeof durationMin === "number" && Number.isFinite(durationMin) && durationMin > 0 ? Math.min(durationMin, 1440) : DEFAULT_ACTIVITY_MINUTES;

  if (eventAt.atMs !== null) {
    const rem = eventAt.atMs - now;
    if (rem > 0 && rem <= 3_600_000) {
      const sec = Math.ceil(rem / 1000);
      const mm = Math.floor(sec / 60);
      const ss = sec % 60;
      return { kind: "minutes", mm, ss, text: `${pad2(mm)}:${pad2(ss)}` };
    }
    if (rem <= 0) return now < eventAt.atMs + dur * 60_000 ? { kind: "ongoing" } : { kind: "none" };
  }

  const days = daysBetween(localDateKey(now), eventAt.dateIso);
  if (!Number.isFinite(days) || days < 0) return { kind: "none" };
  if (days >= 2) return { kind: "days", days };
  if (days === 1) return { kind: "tomorrow", time: timeText(eventAt, clock24h) };
  return { kind: "today", time: timeText(eventAt, clock24h) };
}

/** Everything a kuliah / program / mesyuarat template needs: honours showCountdown and durationMin. */
export function slideActivityCountdown(fields: Record<string, unknown>, now: number, clock24h = false): ActivityCountdown {
  if (fields.showCountdown === false) return { kind: "none" };
  const dur = typeof fields.durationMin === "number" ? fields.durationMin : null;
  return activityCountdown(activityEventAt(fields), dur, now, activityNotice(fields), clock24h);
}
