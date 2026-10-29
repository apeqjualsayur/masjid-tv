// Garis Masa timeline geometry (contract §7, PRD round 2 §5). Pure: epoch-ms times in, pixels out.
// The engine decides current / next / past; this only places things along the bar.
import type { WaktuKey } from "@/core";

/** The window ends this long after Isyak. */
export const TAIL_MS = 72 * 60_000;
/** Gap between segments and their minimum size (px, 1920 stage). */
export const SEGMENT_GAP = 4.5;
export const MIN_SEGMENT = 6;
/** Labels closer than this are staggered onto a second row (PRD §5). */
export const LABEL_MIN_GAP = 140;

/** Segments in order. `syuruk` runs from Syuruk to Zohor (one neutral segment); `isyak` to Isyak + 72 min. */
export const SEGMENT_KEYS: readonly WaktuKey[] = ["imsak", "subuh", "syuruk", "zohor", "asar", "maghrib", "isyak"];
/** Waktu with a label under the bar (Imsak is a small note instead). */
export const LABEL_KEYS: readonly WaktuKey[] = ["subuh", "syuruk", "zohor", "asar", "maghrib", "isyak"];

export type Times = Record<WaktuKey, number>;
export interface Window {
  from: number;
  to: number;
}
export interface Segment {
  key: WaktuKey;
  /** px from the start of the bar */
  start: number;
  size: number;
}

/** Imsak → Isyak + 72 min, or null when a time is unknown. */
export function timelineWindow(t: Times): Window | null {
  const from = t.imsak;
  const to = t.isyak + TAIL_MS;
  return Number.isFinite(from) && Number.isFinite(to) && to > from ? { from, to } : null;
}

/** Position of a moment along a bar of `length` px (not clamped). */
export const toPx = (ms: number, w: Window, length: number) => ((ms - w.from) / (w.to - w.from)) * length;

/** One segment per waktu, widths proportional to real duration. */
export function segments(t: Times, w: Window, length: number): Segment[] {
  const ends: Record<WaktuKey, number> = { imsak: t.subuh, subuh: t.syuruk, syuruk: t.zohor, zohor: t.asar, asar: t.maghrib, maghrib: t.isyak, isyak: w.to };
  return SEGMENT_KEYS.map((key) => {
    const start = toPx(t[key], w, length);
    const end = toPx(ends[key], w, length);
    return { key, start, size: Math.max(MIN_SEGMENT, end - start - SEGMENT_GAP) };
  });
}

/** The now-marker, clamped to the bar before Imsak and after the window. */
export function nowMarker(now: number, w: Window, length: number): { pos: number; clamped: "before" | "after" | null } {
  if (now < w.from) return { pos: 0, clamped: "before" };
  if (now > w.to) return { pos: length, clamped: "after" };
  return { pos: toPx(now, w, length), clamped: null };
}

/**
 * Row for each label (0 = first row, 1 = staggered), left to right: a label goes on the first row
 * whose previous label is at least `minGap` px away; otherwise on the row whose previous label is farthest.
 */
export function labelRows(positions: number[], minGap = LABEL_MIN_GAP, rows = 2): number[] {
  const last: number[] = Array(rows).fill(-Infinity);
  return positions.map((p) => {
    let r = last.findIndex((x) => p - x >= minGap);
    if (r < 0) r = last.indexOf(Math.min(...last));
    last[r] = p;
    return r;
  });
}

/** A label that would run past the end of the bar is anchored on its right side instead. */
export const labelAlign = (pos: number, width: number, length: number): "start" | "end" => (pos + width > length ? "end" : "start");

/**
 * Vertical labels (side layout): each label as close to its anchor as possible, at least `minGap`
 * apart, kept inside 0…length − minGap (pushed down, then back up if they overflow the end).
 */
export function spreadLabels(anchors: number[], minGap: number, length: number): number[] {
  const out = anchors.map((a) => Math.max(0, a));
  for (let i = 1; i < out.length; i++) out[i] = Math.max(out[i], out[i - 1] + minGap);
  const max = length - minGap;
  for (let i = out.length - 1; i >= 0; i--) {
    const limit = i === out.length - 1 ? max : out[i + 1] - minGap;
    out[i] = Math.min(out[i], limit);
  }
  return out.map((y) => Math.max(0, y));
}

const DAY_MS = 86_400_000;

/**
 * The times of a DisplayState's waktu list, keyed. After Isyak the engine lists tomorrow's Imsak and
 * Subuh (Subuh is "next"); for drawing today's bar they are moved back a day, so the window stays
 * Imsak → Isyak + 72 min and the now-marker clamps at the right end. Positions only, never a shown time.
 */
export function timesOf(waktu: { key: WaktuKey; at: number }[]): Times {
  const t = Object.fromEntries(waktu.map((w) => [w.key, w.at])) as Times;
  for (const k of ["imsak", "subuh"] as const) if (Number.isFinite(t[k]) && Number.isFinite(t.syuruk) && t[k] > t.syuruk) t[k] -= DAY_MS;
  return t;
}
