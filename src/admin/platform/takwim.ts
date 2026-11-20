// Platform → Takwim (PRD enhancements §5.2, §5.5): the platform owner enters JAKIM's dates for the 9
// events, one row per event per Hijri year (DB unique (event_key, hijri_year)). Pure: no React, no
// Supabase. Calendar days in Malaysia time.
import { ISLAMIC_EVENT_INFO, ISLAMIC_EVENT_KEYS, daysBetween, isDateKey, type IslamicEvent, type IslamicEventKey } from "@/core";

export type TakwimStatus = "jangkaan" | "rasmi";

/** A row of public.islamic_events. */
export interface TakwimRow {
  id: string;
  event_key: IslamicEventKey;
  hijri_year: number;
  greg_date: string;
  status: TakwimStatus;
  note: string | null;
}

/** What the form edits for one event in one year (id null = not saved yet). */
export interface TakwimDraft {
  id: string | null;
  event_key: IslamicEventKey;
  hijri_year: number;
  greg_date: string;
  status: TakwimStatus;
  note: string;
}

export const NOTE_MAX = 120;
export const YEAR_MIN = 1440;
export const YEAR_MAX = 1600;

/** Hijri years that have rows, newest first. */
export function takwimYears(rows: Pick<TakwimRow, "hijri_year">[]): number[] {
  return [...new Set(rows.map((r) => r.hijri_year))].sort((a, b) => b - a);
}

/** The 9 events of a year in calendar order, saved rows filled in, the others empty (one per event). */
export function yearGrid(rows: TakwimRow[], year: number): TakwimDraft[] {
  return ISLAMIC_EVENT_KEYS.map((k) => {
    const r = rows.find((x) => x.hijri_year === year && x.event_key === k);
    return r
      ? { id: r.id, event_key: k, hijri_year: year, greg_date: r.greg_date, status: r.status, note: r.note ?? "" }
      : { id: null, event_key: k, hijri_year: year, greg_date: "", status: "jangkaan", note: "" };
  });
}

export type TakwimErrors = Partial<Record<"greg_date" | "note" | "hijri_year", "required" | "invalid" | "tooLong">>;

/** A row can be saved only with a real date; note ≤ 120; year 1440–1600 (DB checks). */
export function validateTakwim(d: Pick<TakwimDraft, "greg_date" | "note" | "hijri_year">): TakwimErrors {
  const e: TakwimErrors = {};
  if (!d.greg_date) e.greg_date = "required";
  else if (!isDateKey(d.greg_date)) e.greg_date = "invalid";
  if ([...d.note.trim()].length > NOTE_MAX) e.note = "tooLong";
  if (!Number.isInteger(d.hijri_year) || d.hijri_year < YEAR_MIN || d.hijri_year > YEAR_MAX) e.hijri_year = "invalid";
  return e;
}

/** Columns to write (insert or update by (event_key, hijri_year)). */
export function takwimPayload(d: TakwimDraft): { event_key: IslamicEventKey; hijri_year: number; greg_date: string; status: TakwimStatus; note: string | null } {
  return { event_key: d.event_key, hijri_year: d.hijri_year, greg_date: d.greg_date, status: d.status, note: d.note.trim() || null };
}

export const draftChanged = (d: TakwimDraft, saved: TakwimDraft) =>
  d.greg_date !== saved.greg_date || d.status !== saved.status || d.note.trim() !== saved.note.trim();

/** The next `n` dated events from today (highlighted on the page). */
export function nextEvents(rows: TakwimRow[], today: string, n = 3): TakwimRow[] {
  return rows.filter((r) => isDateKey(r.greg_date) && r.greg_date >= today).sort((a, b) => a.greg_date.localeCompare(b.greg_date)).slice(0, n);
}

/** Distinct events dated within the next 365 days: fewer than 9 → warn (a year is incomplete). */
export function datedNextYear(rows: TakwimRow[], today: string): number {
  return new Set(rows.filter((r) => isDateKey(r.greg_date) && daysBetween(today, r.greg_date) >= 0 && daysBetween(today, r.greg_date) < 365).map((r) => r.event_key)).size;
}

/** The year to offer under "Tambah tahun": the newest + 1, or the current Hijri year. */
export function suggestYear(years: number[], currentHijri: number | null): number {
  if (years.length) return Math.max(...years) + 1;
  return currentHijri ?? 1448;
}

/** Today's Hijri year from the browser (Umm al-Qura), only to suggest a year; null when unsupported. */
export function currentHijriYear(now: Date): number | null {
  try {
    const y = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { year: "numeric", timeZone: "Asia/Kuala_Lumpur" }).format(now);
    const n = parseInt(y, 10);
    return Number.isFinite(n) && n >= YEAR_MIN && n <= YEAR_MAX ? n : null;
  } catch {
    return null;
  }
}

/** "1 Ramadan" for an event (the year is the row's). */
export const hijriDayOf = (k: IslamicEventKey) => `${ISLAMIC_EVENT_INFO[k].hijriDay} ${ISLAMIC_EVENT_INFO[k].hijriMonth}`;

/** Rows as the TV / preview takes them. */
export function rowsToEvents(rows: TakwimRow[]): IslamicEvent[] {
  return rows.filter((r) => isDateKey(r.greg_date)).map((r) => ({ key: r.event_key, hijriYear: r.hijri_year, date: r.greg_date, status: r.status }));
}

/** Events dated within the next 12 months (the editor's read-only list), in date order. */
export function upcomingYear(rows: TakwimRow[], today: string): TakwimRow[] {
  return rows.filter((r) => isDateKey(r.greg_date) && daysBetween(today, r.greg_date) >= 0 && daysBetween(today, r.greg_date) <= 365).sort((a, b) => a.greg_date.localeCompare(b.greg_date));
}

/** Hari Kebesaran slide fields (§5.3): at least one event chosen when a list is given. */
export function validateKebesaranEvents(fields: Record<string, unknown>): Record<string, { code: "required" }> {
  const ev = fields.events;
  return Array.isArray(ev) && ev.length === 0 ? { events: { code: "required" } } : {};
}
