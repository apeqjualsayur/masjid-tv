// When the TV plays a sound cue (_specs/50-PRD-sound.md D2, D5). Pure: the caller passes the clock
// readings (from now()) of two consecutive ticks; this decides, it never plays anything.
//   azan   — on entering AZAN (Subuh, Zohor, Asar, Maghrib, Isyak, and Friday Zohor)
//   iqamah — on entering SOLAT from IQAMAH (never Friday Zohor: khutbah → solat)
// Never for Imsak/Syuruk, never on the poster layout, never on the first tick after a load, never
// when the boundary passed more than the tolerance ago (clock jump, waking mid-mode). A forced mode
// (?mode=) fires on entry: azan → azan, solat → iqamah (not Friday Zohor), others none.
import type { LayoutKey, ModeKey, PrayerKey, WaktuKey } from "./types";
import { localDateKey } from "./time";
import { isPrayer } from "./waktu";

export type CueEvent = "azan" | "iqamah";

export interface SoundCue {
  event: CueEvent;
  waktu: PrayerKey;
}

/** What the cue rules need from one tick's DisplayState. */
export interface CueTick {
  /** Clock time of the tick (offset + sim corrected, from now()). */
  at: number;
  mode: ModeKey;
  /** The waktu the mode is about (DisplayState.modeTarget.key). */
  waktu?: WaktuKey;
  /** When the mode began (DisplayState.modeStartMs). */
  modeStartMs?: number;
  layout: LayoutKey;
  isFriday: boolean;
  /** The mode is debug-forced (?mode=). */
  forced?: boolean;
}

export interface CueOptions {
  /** No previous tick on this page (load, reload, soft restart). */
  firstTick: boolean;
  /** Default 3 s; see cueToleranceMs for sped-up clocks. */
  toleranceMs?: number;
  /** Cues already played on this page (cueKey); a re-entered mode never plays twice. */
  played?: ReadonlySet<string>;
}

export const CUE_TOLERANCE_MS = 3000;

/**
 * Tolerance for a clock running `speed`× (debug): at least 3 s, and at least two ticks of simulated
 * time (useNow ticks once per simulated second, but never faster than every 50 ms real time).
 */
export function cueToleranceMs(speed = 1): number {
  const tickSim = speed > 1 ? Math.max(50, 1000 / speed) * speed : 1000;
  return Math.max(CUE_TOLERANCE_MS, 2 * tickSim);
}

/** One key per (local date of the boundary, waktu, cue): each plays at most once per page load. */
export function cueKey(cue: SoundCue, boundaryMs: number): string {
  return `${localDateKey(boundaryMs)}:${cue.waktu}:${cue.event}`;
}

/** The cue a forced mode plays when it starts. */
function forcedCue(cur: CueTick, waktu: PrayerKey): SoundCue | null {
  if (cur.mode === "azan") return { event: "azan", waktu };
  if (cur.mode === "solat" && !(cur.isFriday && waktu === "zohor")) return { event: "iqamah", waktu };
  return null;
}

export function soundCue(prev: CueTick | null, cur: CueTick, opts: CueOptions): SoundCue | null {
  if (cur.layout === "poster") return null;
  if (!cur.waktu || !isPrayer(cur.waktu)) return null; // normal mode, Imsak, Syuruk
  const waktu = cur.waktu;

  let cue: SoundCue | null;
  if (cur.forced) {
    // Fires on entry, also on the first tick (that is how a forced mode is tested).
    const entered = !prev || !prev.forced || prev.mode !== cur.mode || prev.waktu !== cur.waktu;
    cue = entered ? forcedCue(cur, waktu) : null;
  } else {
    if (opts.firstTick || !prev || prev.forced) return null;
    if (prev.mode === cur.mode && prev.waktu === cur.waktu) return null; // no transition
    if (cur.mode === "azan") cue = { event: "azan", waktu };
    else if (cur.mode === "solat" && prev.mode === "iqamah" && prev.waktu === waktu && !(cur.isFriday && waktu === "zohor")) cue = { event: "iqamah", waktu };
    else cue = null;
    if (!cue) return null;
    // The boundary must have passed just now: not a clock jump or a wake-up in the middle of a mode.
    const start = cur.modeStartMs;
    const tol = opts.toleranceMs ?? CUE_TOLERANCE_MS;
    if (start === undefined || !Number.isFinite(start) || cur.at < start || cur.at - start > tol) return null;
  }
  if (!cue) return null;
  if (opts.played?.has(cueKey(cue, cur.modeStartMs ?? cur.at))) return null;
  return cue;
}
