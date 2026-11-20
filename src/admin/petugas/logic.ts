// Petugas page (PRD enhancements §6.1–6.2): the masjid's imam / bilal list and the weekly roster grid.
// Pure: no React, no Supabase. Days use the database numbering: 1 = Isnin … 7 = Ahad.
import type { PrayerKey, Roster } from "@/core";

export type Role = "imam" | "bilal";
export const ROLES: readonly Role[] = ["imam", "bilal"];
export const WAKTU: readonly PrayerKey[] = ["subuh", "zohor", "asar", "maghrib", "isyak"];
export const DAYS = [1, 2, 3, 4, 5, 6, 7] as const;
export const WEEKDAYS = [1, 2, 3, 4, 5] as const; // Isnin–Jumaat
export const JUMAAT = 5;

export const MAX_PETUGAS = 40;
export const NAME_MIN = 2;
export const NAME_MAX = 60;
export const TITLE_MAX = 20;
export const TITLE_SUGGESTIONS = ["Ustaz", "Ust.", "Hj.", "Tuan Hj.", "Imam"] as const;

/** A row of public.petugas. */
export interface Petugas {
  id: string;
  name: string;
  title: string | null;
  roles: Role[];
  active: boolean;
  sort_order: number;
}

export interface PetugasForm {
  name: string;
  title: string;
  roles: Role[];
  active: boolean;
}

export type PetugasErrors = Partial<Record<"name" | "title" | "roles", "required" | "length" | "tooLong">>;

const len = (s: string) => [...s.trim()].length;

/** Same rules as the database: name 2–60, title ≤ 20, at least one role. */
export function validatePetugas(f: Pick<PetugasForm, "name" | "title" | "roles">): PetugasErrors {
  const e: PetugasErrors = {};
  if (!f.name.trim()) e.name = "required";
  else if (len(f.name) < NAME_MIN || len(f.name) > NAME_MAX) e.name = "length";
  if (len(f.title) > TITLE_MAX) e.title = "tooLong";
  if (!f.roles.length) e.roles = "required";
  return e;
}

/** Columns to write. */
export const petugasPayload = (f: PetugasForm) => ({ name: f.name.trim(), title: f.title.trim() || null, roles: ROLES.filter((r) => f.roles.includes(r)), active: f.active });

/** Roles taken away by an edit: their roster slots will be emptied (DB trigger petugas_after_change). */
export const removedRoles = (before: Role[], after: Role[]): Role[] => before.filter((r) => !after.includes(r));

/** "Ust. Ahmad Zaki" */
export const displayName = (p: Pick<Petugas, "name" | "title">) => (p.title ? `${p.title} ${p.name}` : p.name);

/** List order: sort_order, then name. */
export const byOrder = (a: Petugas, b: Petugas) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "ms");

/** sort_order changes after a reorder: [{id, sort_order}] for the rows whose position changed. */
export function reorderUpdates(list: Petugas[], newOrder: string[]): { id: string; sort_order: number }[] {
  return newOrder.flatMap((id, i) => {
    const p = list.find((x) => x.id === id);
    return p && p.sort_order !== i + 1 ? [{ id, sort_order: i + 1 }] : [];
  });
}

// ------------------------------------------------------------------ roster grid

export interface Pair {
  imam: string | null;
  bilal: string | null;
}
export interface DayGrid {
  /** Sepanjang hari */
  all: Pair;
  /** Exceptions; null = follows the day */
  waktu: Record<PrayerKey, Pair>;
}
export type Grid = Record<number, DayGrid>;

/** A row of public.roster_slots. */
export interface SlotRow {
  day_of_week: number;
  waktu: PrayerKey | null;
  role: Role;
  petugas_id: string;
}

/** roster_save(p_slots) item. */
export interface SlotPayload {
  day: number;
  waktu: PrayerKey | null;
  role: Role;
  petugasId: string;
}

const emptyPair = (): Pair => ({ imam: null, bilal: null });
const emptyDay = (): DayGrid => ({ all: emptyPair(), waktu: Object.fromEntries(WAKTU.map((w) => [w, emptyPair()])) as Record<PrayerKey, Pair> });

export function emptyGrid(): Grid {
  return Object.fromEntries(DAYS.map((d) => [d, emptyDay()]));
}

export function gridFromSlots(slots: SlotRow[]): Grid {
  const g = emptyGrid();
  for (const s of slots) {
    const day = g[s.day_of_week];
    if (!day || (s.role !== "imam" && s.role !== "bilal")) continue;
    if (s.waktu === null) day.all[s.role] = s.petugas_id;
    else if (day.waktu[s.waktu]) day.waktu[s.waktu][s.role] = s.petugas_id;
  }
  return g;
}

/** The whole grid for roster_save: day order, all-day first, then Subuh … Isyak; blanks left out. */
export function gridToSlots(g: Grid): SlotPayload[] {
  const out: SlotPayload[] = [];
  for (const day of DAYS) {
    const d = g[day];
    for (const role of ROLES) if (d.all[role]) out.push({ day, waktu: null, role, petugasId: d.all[role]! });
    for (const w of WAKTU) for (const role of ROLES) if (d.waktu[w][role]) out.push({ day, waktu: w, role, petugasId: d.waktu[w][role]! });
  }
  return out;
}

const cloneDay = (d: DayGrid): DayGrid => ({ all: { ...d.all }, waktu: Object.fromEntries(WAKTU.map((w) => [w, { ...d.waktu[w] }])) as Record<PrayerKey, Pair> });

export function setSlot(g: Grid, day: number, waktu: PrayerKey | null, role: Role, id: string | null): Grid {
  const d = cloneDay(g[day]);
  if (waktu === null) d.all[role] = id;
  else d.waktu[waktu][role] = id;
  return { ...g, [day]: d };
}

/** "Salin ke semua hari" / "Salin ke hari bekerja": the day (with its exceptions) onto other days. */
export function copyDay(g: Grid, from: number, to: readonly number[]): Grid {
  const out = { ...g };
  for (const d of to) if (d !== from) out[d] = cloneDay(g[from]);
  return out;
}

export const clearDay = (g: Grid, day: number): Grid => ({ ...g, [day]: emptyDay() });

/** The day has at least one per-waktu entry. */
export const hasExceptions = (d: DayGrid) => WAKTU.some((w) => d.waktu[w].imam || d.waktu[w].bilal);

export const gridsEqual = (a: Grid, b: Grid) => JSON.stringify(gridToSlots(a)) === JSON.stringify(gridToSlots(b));

/**
 * A dropdown's choices: active petugas with that role, plus the one already chosen even if it has
 * since been deactivated (so the grid never silently drops it; the TV hides inactive petugas).
 */
export function optionsFor(list: Petugas[], role: Role, selected: string | null): { id: string; label: string; inactive: boolean }[] {
  const ok = list.filter((p) => p.active && p.roles.includes(role)).sort(byOrder).map((p) => ({ id: p.id, label: displayName(p), inactive: false }));
  if (selected && !ok.some((o) => o.id === selected)) {
    const p = list.find((x) => x.id === selected);
    if (p) ok.push({ id: p.id, label: displayName(p), inactive: true });
  }
  return ok;
}

/** i18n key for a database error (petugas_full, bad_petugas, not_allowed, bad_slots, duplicate, network). */
export function petugasErrorKey(e: { message?: string; code?: string } | null): string | null {
  if (!e) return null;
  const m = e.message ?? "";
  if (m.includes("petugas_full")) return "petugas.err.full";
  if (m.includes("bad_petugas")) return "petugas.err.badPetugas";
  if (m.includes("bad_slots")) return "petugas.err.badSlots";
  if (m.includes("not_allowed") || e.code === "42501") return "petugas.err.notAllowed";
  if (e.code === "23505") return "petugas.err.duplicate";
  if (e.code === "23514") return "petugas.err.invalid";
  if (/failed to fetch|network|load failed/i.test(m)) return "petugas.err.network";
  return "petugas.err.generic";
}

// ------------------------------------------------------------------ editor preview

/**
 * The roster as the TV gets it in the bundle (§7.3): active petugas only, and the slots that point at
 * one of them. The Jadual Imam & Bilal editor previews with this.
 */
export function rowsToRoster(list: Petugas[], slots: SlotRow[]): Roster {
  const active = list.filter((p) => p.active).sort(byOrder);
  const ids = new Set(active.map((p) => p.id));
  return {
    petugas: active.map((p) => ({ id: p.id, name: p.name, title: p.title, roles: p.roles })),
    slots: slots.filter((x) => ids.has(x.petugas_id)).map((x) => ({ day: x.day_of_week, waktu: x.waktu, role: x.role, petugasId: x.petugas_id })),
  };
}
