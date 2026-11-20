// Hari kebesaran Islam slide (_specs/60-PRD-enhancements.md §5). Dates come only from the platform
// takwim in the bundle (D6); nothing here computes a Hijri date. Pure: the caller passes the time.
import { daysBetween, isDateKey } from "./activity";
import { localDateKey, nextDateKey } from "./time";

export const ISLAMIC_EVENT_KEYS = [
  "awal_muharram", "maulidur_rasul", "israk_mikraj", "nisfu_syaaban", "awal_ramadan",
  "nuzul_quran", "aidilfitri", "hari_arafah", "aidiladha",
] as const;
export type IslamicEventKey = (typeof ISLAMIC_EVENT_KEYS)[number];
export const isIslamicEventKey = (v: unknown): v is IslamicEventKey =>
  typeof v === "string" && (ISLAMIC_EVENT_KEYS as readonly string[]).includes(v);

/** One takwim row as sent in the bundle (§7.3). */
export interface IslamicEvent {
  key: IslamicEventKey;
  hijriYear: number;
  /** Gregorian date in Malaysia, "YYYY-MM-DD". */
  date: string;
  status: "jangkaan" | "rasmi";
}

/** §5.1: Hijri day + month, label, greeting on the day, and whether the eve ("Malam ini") applies. */
export const ISLAMIC_EVENT_INFO: Record<IslamicEventKey, { hijriDay: number; hijriMonth: string; label: string; greeting: string; nightBefore: boolean }> = {
  awal_muharram: { hijriDay: 1, hijriMonth: "Muharram", label: "Awal Muharram", greeting: "Salam Maal Hijrah {year}H", nightBefore: false },
  maulidur_rasul: { hijriDay: 12, hijriMonth: "Rabiulawal", label: "Maulidur Rasul", greeting: "Salam Maulidur Rasul", nightBefore: false },
  israk_mikraj: { hijriDay: 27, hijriMonth: "Rejab", label: "Israk dan Mikraj", greeting: "Israk dan Mikraj", nightBefore: true },
  nisfu_syaaban: { hijriDay: 15, hijriMonth: "Syaaban", label: "Nisfu Syaaban", greeting: "Malam Nisfu Syaaban", nightBefore: true },
  awal_ramadan: { hijriDay: 1, hijriMonth: "Ramadan", label: "Awal Ramadan", greeting: "Ramadan Kareem", nightBefore: false },
  nuzul_quran: { hijriDay: 17, hijriMonth: "Ramadan", label: "Nuzul Al-Quran", greeting: "Nuzul Al-Quran", nightBefore: true },
  aidilfitri: { hijriDay: 1, hijriMonth: "Syawal", label: "Hari Raya Aidilfitri", greeting: "Selamat Hari Raya Aidilfitri", nightBefore: false },
  hari_arafah: { hijriDay: 9, hijriMonth: "Zulhijjah", label: "Hari Arafah", greeting: "Hari Arafah", nightBefore: false },
  aidiladha: { hijriDay: 10, hijriMonth: "Zulhijjah", label: "Hari Raya Aidiladha", greeting: "Selamat Hari Raya Aidiladha", nightBefore: false },
};

/** An event ready to render. */
export interface IslamicEventView {
  key: IslamicEventKey;
  label: string;
  /** "1 Ramadan 1448H" */
  hijri: string;
  /** "YYYY-MM-DD" (the theme formats it through core, e.g. formatGregorian) */
  date: string;
  /** Not yet confirmed by the official announcement: show a small "jangkaan" label. */
  jangkaan: boolean;
}

export interface IslamicMore {
  event: IslamicEventView;
  /** Calendar days from today (≥ 1). */
  days: number;
}

export type IslamicHeadline =
  | { kind: "greeting"; event: IslamicEventView; text: string }
  | { kind: "malamIni"; event: IslamicEventView }
  /** day 1–30; aidilfitriInDays null when the takwim has no Aidilfitri date for that year */
  | { kind: "ramadan"; day: number; aidilfitriInDays: number | null; event: IslamicEventView }
  /** days ≥ 1 ("Esok" when 1) */
  | { kind: "countdown"; event: IslamicEventView; days: number }
  | { kind: "empty" };

export type IslamicView = IslamicHeadline & { more: IslamicMore[] };

/** Slide fields (§5.3), checked: unknown keys dropped, leadDays 7–365 (60), showMore 0–2 (2). */
export interface HariKebesaranOptions {
  events: IslamicEventKey[];
  leadDays: number;
  showMore: number;
}

const clampInt = (v: unknown, min: number, max: number, dflt: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : dflt;

export function hariKebesaranOptions(fields: Record<string, unknown>): HariKebesaranOptions {
  return {
    events: Array.isArray(fields.events) ? ISLAMIC_EVENT_KEYS.filter((k) => (fields.events as unknown[]).includes(k)) : [...ISLAMIC_EVENT_KEYS],
    leadDays: clampInt(fields.leadDays, 7, 365, 60),
    showMore: clampInt(fields.showMore, 0, 2, 2),
  };
}

/** `dayOffset` 1 = the day after the event (Aidilfitri day 2: "2 Syawal", that day's date). */
export function islamicEventView(e: IslamicEvent, dayOffset = 0): IslamicEventView {
  const info = ISLAMIC_EVENT_INFO[e.key];
  const date = dayOffset ? nextDateKey(e.date) : e.date;
  return { key: e.key, label: info.label, hijri: `${info.hijriDay + dayOffset} ${info.hijriMonth} ${e.hijriYear}H`, date, jangkaan: e.status === "jangkaan" };
}

/**
 * What the slide shows at `now` (§5.4, first match wins): greeting day → "Malam ini" (after Maghrib on
 * the eve) → Ramadan day N → countdown to the nearest event within leadDays → empty (slide skipped).
 * `more` = up to showMore further events within leadDays. `maghribTodayMs` = today's Maghrib from the
 * prayer engine; null skips the "Malam ini" state.
 */
export function islamicEventsView(
  events: readonly IslamicEvent[],
  fields: Record<string, unknown>,
  now: number,
  maghribTodayMs: number | null,
): IslamicView {
  const opt = hariKebesaranOptions(fields);
  const today = localDateKey(now);
  const tomorrow = nextDateKey(today);
  const all = events.filter((e) => isIslamicEventKey(e.key) && isDateKey(e.date));
  const included = all.filter((e) => opt.events.includes(e.key)).sort((a, b) => a.date.localeCompare(b.date) || ISLAMIC_EVENT_KEYS.indexOf(a.key) - ISLAMIC_EVENT_KEYS.indexOf(b.key));

  const upcoming = included
    .map((e) => ({ e, days: daysBetween(today, e.date) }))
    .filter((x) => x.days >= 1 && x.days <= opt.leadDays);
  const moreAfter = (skip: IslamicEvent | null): IslamicMore[] =>
    upcoming.filter((x) => x.e !== skip).slice(0, opt.showMore).map((x) => ({ event: islamicEventView(x.e), days: x.days }));

  // 1. Greeting day (Aidilfitri: 1 and 2 Syawal).
  const greet = included.find((e) => e.date === today || (e.key === "aidilfitri" && nextDateKey(e.date) === today));
  if (greet) {
    const text = ISLAMIC_EVENT_INFO[greet.key].greeting.replace("{year}", String(greet.hijriYear));
    return { kind: "greeting", event: islamicEventView(greet, greet.date === today ? 0 : 1), text, more: moreAfter(null) };
  }

  // 2. Malam ini: after Maghrib on the eve of a "night before" event.
  if (maghribTodayMs !== null && now >= maghribTodayMs) {
    const eve = included.find((e) => e.date === tomorrow && ISLAMIC_EVENT_INFO[e.key].nightBefore);
    if (eve) return { kind: "malamIni", event: islamicEventView(eve), more: moreAfter(eve) };
  }

  // 3. Ramadan: from awal_ramadan up to the day before aidilfitri of the same Hijri year.
  //    The latest start on or before today (`included` is sorted by date). Without an Aidilfitri row
  //    for that year, Ramadan is taken as at most 30 days.
  const ramadan = included.filter((e) => e.key === "awal_ramadan" && e.date <= today).pop();
  if (ramadan) {
    const day = daysBetween(ramadan.date, today) + 1;
    const fitri = all.find((e) => e.key === "aidilfitri" && e.hijriYear === ramadan.hijriYear);
    if (fitri ? today < fitri.date : day <= 30) {
      return { kind: "ramadan", day, aidilfitriInDays: fitri ? daysBetween(today, fitri.date) : null, event: islamicEventView(ramadan), more: moreAfter(null) };
    }
  }

  // 4. Countdown to the nearest included event within leadDays.
  const next = upcoming[0];
  if (next) return { kind: "countdown", event: islamicEventView(next.e), days: next.days, more: moreAfter(next.e) };

  return { kind: "empty", more: [] };
}
