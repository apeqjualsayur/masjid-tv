// Jadual Imam & Bilal (_specs/60-PRD-enhancements.md §6). Resolution from the bundle's roster only
// (D7). Pure. Days use the database numbering: 1 = Isnin … 7 = Ahad.
import { waktuName } from "./waktu";
import { nextDateKey, weekdayOfDateKey } from "./time";
import type { PrayerKey } from "./types";

export type RosterRole = "imam" | "bilal";
export const ROSTER_ROLES: readonly RosterRole[] = ["imam", "bilal"];

export interface Petugas {
  id: string;
  name: string;
  /** "Ust.", "Hj." … or null */
  title: string | null;
  roles: RosterRole[];
}

export interface RosterSlot {
  /** 1 = Isnin … 7 = Ahad */
  day: number;
  /** null = sepanjang hari (the whole day) */
  waktu: PrayerKey | null;
  role: RosterRole;
  petugasId: string;
}

/** As sent in the bundle (§7.3): active petugas only, and their slots. */
export interface Roster {
  petugas: Petugas[];
  slots: RosterSlot[];
}

export const EMPTY_ROSTER: Roster = { petugas: [], slots: [] };

export const HARI_ISNIN_FIRST = ["Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu", "Ahad"] as const;
const ROSTER_WAKTU: readonly PrayerKey[] = ["subuh", "zohor", "asar", "maghrib", "isyak"];

/** A resolved person: "title + name" for display. */
export interface RosterPerson {
  id: string;
  name: string;
  title: string | null;
  /** "Ust. Ahmad Zaki" */
  display: string;
}

export interface RosterPair {
  imam: RosterPerson | null;
  bilal: RosterPerson | null;
}

/** Local date key → roster day (1 = Isnin … 7 = Ahad). */
export function rosterDayOf(dateKey: string): number {
  const wd = weekdayOfDateKey(dateKey); // 0 = Ahad
  return wd === 0 ? 7 : wd;
}

function person(r: Roster, id: string | undefined): RosterPerson | null {
  if (!id) return null;
  const p = r.petugas.find((x) => x.id === id);
  if (!p) return null; // inactive or deleted petugas: not in the bundle
  return { id: p.id, name: p.name, title: p.title, display: p.title ? `${p.title} ${p.name}` : p.name };
}

const slotId = (r: Roster, day: number, waktu: PrayerKey | null, role: RosterRole) =>
  r.slots.find((s) => s.day === day && s.waktu === waktu && s.role === role)?.petugasId;

/** One role on a day: the waktu slot, else the day's all-day slot, else null ("—"). No waktu = all-day only. */
export function resolveRole(r: Roster, day: number, role: RosterRole, waktu?: PrayerKey | null): RosterPerson | null {
  if (waktu) {
    const w = person(r, slotId(r, day, waktu, role));
    if (w) return w;
  }
  return person(r, slotId(r, day, null, role));
}

/** Imam and bilal for a date ("YYYY-MM-DD"), optionally for one waktu (§6.1 resolution). */
export function resolveRoster(r: Roster, dateKey: string, waktu?: PrayerKey | null): RosterPair {
  const day = rosterDayOf(dateKey);
  return { imam: resolveRole(r, day, "imam", waktu), bilal: resolveRole(r, day, "bilal", waktu) };
}

/** The day has at least one per-waktu slot (shown as "+ ikut waktu" in the weekly view). */
export function hasWaktuExceptions(r: Roster, day: number): boolean {
  return r.slots.some((s) => s.day === day && s.waktu !== null && !!person(r, s.petugasId));
}

export interface WeekRosterRow extends RosterPair {
  day: number;
  /** "Isnin" … "Ahad" */
  label: string;
  isToday: boolean;
  hasWaktuExceptions: boolean;
}

/** `minggu` view: 7 rows Isnin → Ahad with the all-day names. `todayKey` marks today's row. */
export function weekRoster(r: Roster, todayKey?: string): WeekRosterRow[] {
  const today = todayKey ? rosterDayOf(todayKey) : 0;
  return HARI_ISNIN_FIRST.map((label, i) => {
    const day = i + 1;
    return {
      day,
      label,
      isToday: day === today,
      hasWaktuExceptions: hasWaktuExceptions(r, day),
      imam: resolveRole(r, day, "imam"),
      bilal: resolveRole(r, day, "bilal"),
    };
  });
}

export interface DayRosterRow extends RosterPair {
  waktu: PrayerKey;
  /** "Subuh" … "Isyak"; Zohor is "Jumaat" on Friday */
  label: string;
}

/** `hari_ini` view: today's 5 waktu, resolved, plus tomorrow's all-day pair ("Esok: Imam … · Bilal …"). */
export function dayRoster(r: Roster, dateKey: string): { rows: DayRosterRow[]; tomorrow: RosterPair } {
  const isFriday = rosterDayOf(dateKey) === 5;
  return {
    rows: ROSTER_WAKTU.map((w) => ({ waktu: w, label: waktuName(w, isFriday).label, ...resolveRoster(r, dateKey, w) })),
    tomorrow: resolveRoster(r, nextDateKey(dateKey)),
  };
}

/** No usable slot at all → the jadual_petugas slide is skipped (§6.4). */
export function rosterIsEmpty(r: Roster): boolean {
  return !r.slots.some((s) => !!person(r, s.petugasId));
}
