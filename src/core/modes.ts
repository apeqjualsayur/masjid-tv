// Display mode state machine (PRD section 5):
//   normal > pre_azan > azan > iqamah > solat > normal
//   Friday Zohor: ... azan > khutbah > solat > normal
// Markers (Imsak, Syuruk) never trigger a mode.
import type { ModeKey, PrayerKey, WaktuKey } from "./types";
import { PRAYER_KEYS } from "./waktu";

export interface ModeDurations {
  preAzanMin: number;
  azanMin: number;
  solatMin: number;
  khutbahMin: number;
}

export type IqamahMinutes = Record<PrayerKey, number>;

export interface ModeConfig {
  durations: ModeDurations;
  iqamahMin: IqamahMinutes;
}

export type ActiveMode = Exclude<ModeKey, "normal">;

export interface ModeWindow {
  mode: ActiveMode;
  target: PrayerKey;
  startMs: number;
  endMs: number;
}

export interface ModeState {
  mode: ModeKey;
  /** The prayer the mode is about. Undefined in normal mode. */
  target?: PrayerKey;
  startMs?: number;
  endMs?: number;
  /** Whole seconds left in this mode, rounded up (iqamah starts at exactly iqamahMin x 60). */
  remainingSec?: number;
  /** 0..1 elapsed. */
  progress?: number;
}

const MIN = 60_000;

/** The consecutive mode windows around one prayer at `prayerMs`. Zero-length modes are skipped. */
export function prayerWindows(target: PrayerKey, prayerMs: number, isFriday: boolean, cfg: ModeConfig): ModeWindow[] {
  const d = cfg.durations;
  const windows: ModeWindow[] = [];
  let start = prayerMs - Math.max(0, d.preAzanMin) * MIN;
  const add = (mode: ActiveMode, minutes: number) => {
    const len = Math.max(0, minutes) * MIN;
    if (len > 0) windows.push({ mode, target, startMs: start, endMs: start + len });
    start += len;
  };
  add("pre_azan", d.preAzanMin);
  add("azan", d.azanMin);
  if (isFriday && target === "zohor") add("khutbah", d.khutbahMin);
  else add("iqamah", cfg.iqamahMin[target]);
  add("solat", d.solatMin);
  return windows;
}

function stateOf(w: ModeWindow, at: number): ModeState {
  const len = w.endMs - w.startMs;
  return {
    mode: w.mode,
    target: w.target,
    startMs: w.startMs,
    endMs: w.endMs,
    remainingSec: Math.max(0, Math.ceil((w.endMs - at) / 1000)),
    progress: len > 0 ? Math.min(1, Math.max(0, (at - w.startMs) / len)) : 1,
  };
}

/**
 * The mode at instant `at` for one day's times. Windows are [start, end).
 * If windows ever overlap (unusual config), a full-screen mode beats a pre-azan banner,
 * and otherwise the later prayer wins.
 */
export function computeMode(
  times: Record<WaktuKey, number>,
  isFriday: boolean,
  cfg: ModeConfig,
  at: number,
): ModeState {
  let preAzan: ModeWindow | undefined;
  for (const target of [...PRAYER_KEYS].reverse()) {
    for (const w of prayerWindows(target, times[target], isFriday, cfg)) {
      if (at < w.startMs || at >= w.endMs) continue;
      if (w.mode !== "pre_azan") return stateOf(w, at);
      preAzan ??= w;
    }
  }
  return preAzan ? stateOf(preAzan, at) : { mode: "normal" };
}

/**
 * Debug `mode=` override: show `mode` for `target` as if it began at `sinceMs`.
 * Once its duration is used up it holds at remaining 0 / progress 1.
 */
export function forcedMode(mode: ModeKey, target: PrayerKey, sinceMs: number, cfg: ModeConfig, at: number): ModeState {
  if (mode === "normal") return { mode: "normal" };
  const d = cfg.durations;
  const minutes: Record<ActiveMode, number> = {
    pre_azan: d.preAzanMin,
    azan: d.azanMin,
    iqamah: cfg.iqamahMin[target],
    khutbah: d.khutbahMin,
    solat: d.solatMin,
  };
  const w: ModeWindow = { mode, target, startMs: sinceMs, endMs: sinceMs + minutes[mode] * MIN };
  return stateOf(w, Math.max(at, sinceMs));
}
