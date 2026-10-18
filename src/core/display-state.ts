// Builds the DisplayState that every theme renders (_specs/01-theme-contract.md section 1).
// Pure: same inputs, same output. Themes never compute any of this themselves.
import { formatGregorian, formatHijri, formatSeconds, formatTime } from "./format";
import { computeMode, forcedMode, type ModeConfig } from "./modes";
import { computeSchedule, type ScheduleState, type WaktuEntry } from "./schedule";
import type { DayTimes, ModeKey, PhaseKey, PrayerKey, WaktuKey, WaktuState } from "./types";

export interface WaktuView {
  key: WaktuKey;
  /** "Zohor" or "Jumaat" on Friday */
  label: string;
  /** "ظهر" */
  arabic: string;
  /** "1:05" (already formatted); "–" if unknown (tomorrow's Imsak not published) */
  time: string;
  state: WaktuState;
  /** imsak, syuruk */
  isMarker: boolean;
}

export interface DisplayState {
  /** offset-corrected */
  now: Date;
  /** "1:20" */
  clock: string;
  /** "36" */
  seconds: string;
  /** "Sabtu, 17 Oktober 2026" */
  gregorian: string;
  /** "6 Jamadilawal 1448H" */
  hijri: string;
  phase: PhaseKey;
  /** always 7, in order */
  waktu: WaktuView[];
  current?: WaktuView;
  next: WaktuView;
  /** "2 jam 51 minit"; "" if the next time is unknown */
  countdownText: string;
  mode: ModeKey;
  /** the waktu the mode is about */
  modeTarget?: WaktuView;
  /** for iqamah / khutbah */
  modeRemainingSec?: number;
  /** 0..1 elapsed */
  modeProgress?: number;
  isFriday: boolean;
  masjid: { fullName: string; shortName: string; logoUrl?: string };
  showArabic: boolean;
  ticker: string[];
  /** low-end device: no blur, fewer effects */
  lite: boolean;
}

export interface ForcedModeInput {
  mode: ModeKey;
  target: PrayerKey;
  sinceMs: number;
}

export interface DisplayInputs {
  at: number;
  today: DayTimes;
  /** Tomorrow's Imsak and Subuh; null when tomorrow's data is not available: shown as "–", never guessed. */
  tomorrowImsak: number | null;
  tomorrowSubuh: number | null;
  forceFriday?: boolean;
  clock24h: boolean;
  showArabic: boolean;
  ticker: string[];
  lite: boolean;
  masjid: { fullName: string; shortName: string; logoUrl?: string };
  modeConfig: ModeConfig;
  /** Debug mode= override. */
  forced?: ForcedModeInput;
}

/** The prayer a forced mode should be about: the next prayer (never a marker). */
export function upcomingPrayer(s: ScheduleState): PrayerKey {
  return s.next.key as PrayerKey;
}

export function buildDisplayState(i: DisplayInputs): DisplayState {
  const sched = computeSchedule(
    { today: i.today, tomorrowImsak: i.tomorrowImsak ?? NaN, tomorrowSubuh: i.tomorrowSubuh ?? NaN, forceFriday: i.forceFriday },
    i.at,
  );
  const view = (w: WaktuEntry): WaktuView => ({
    key: w.key,
    label: w.label,
    arabic: w.arabic,
    time: Number.isFinite(w.time) ? formatTime(w.time, i.clock24h) : "–",
    state: w.state,
    isMarker: w.isMarker,
  });
  const waktu = sched.waktu.map(view);
  const m = i.forced
    ? forcedMode(i.forced.mode, i.forced.target, i.forced.sinceMs, i.modeConfig, i.at)
    : computeMode(i.today.times, sched.isFriday, i.modeConfig, i.at);

  return {
    now: new Date(i.at),
    clock: formatTime(i.at, i.clock24h),
    seconds: formatSeconds(i.at),
    gregorian: formatGregorian(i.at),
    hijri: formatHijri(i.today.hijri),
    phase: sched.phase,
    waktu,
    current: waktu.find((w) => w.state === "current"),
    next: waktu.find((w) => w.state === "next")!,
    countdownText: Number.isFinite(sched.msToNext) ? sched.countdownText : "",
    mode: m.mode,
    modeTarget: m.target ? waktu.find((w) => w.key === m.target) : undefined,
    modeRemainingSec: m.remainingSec,
    modeProgress: m.progress,
    isFriday: sched.isFriday,
    masjid: i.masjid,
    showArabic: i.showArabic,
    ticker: i.ticker,
    lite: i.lite,
  };
}