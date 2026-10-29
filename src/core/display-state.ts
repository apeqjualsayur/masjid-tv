// Builds the DisplayState that every theme renders (_specs/01-theme-contract.md section 1).
// Pure: same inputs, same output. Themes never compute any of this themselves.
import { formatGregorian, formatHijri, formatSeconds, formatTime } from "./format";
import { fridayInfo, type FridayInfo } from "./friday";
import { computeMode, forcedMode, type ModeConfig } from "./modes";
import { computeSchedule, type ScheduleState, type WaktuEntry } from "./schedule";
import type { DayTimes, LayoutKey, ModeKey, PhaseKey, PrayerKey, WaktuKey, WaktuState } from "./types";
import { isPrayer } from "./waktu";

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
  /**
   * Iqamah time, "1:15": azan + the masjid's iqamahMin for this waktu, formatted like `time`
   * (PRD round 2 D5). Undefined for imsak, syuruk, Friday Zohor (khutbah instead) and unknown times.
   */
  iqamah?: string;
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
  /** Friday strip data: on Friday from 00:00 until Solat Jumaat ends, if enabled (PRD §5.1). */
  friday?: FridayInfo;
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
  /** The screen's layout. `poster` never switches to a prayer mode (PRD round 2 D2); phase is still computed (D3). */
  layout?: LayoutKey;
}

/** The prayer a forced mode should be about: the next prayer (never a marker). */
export function upcomingPrayer(s: ScheduleState): PrayerKey {
  return s.next.key as PrayerKey;
}

/**
 * The waktu a mode is about. Friday Zohor PRE_AZAN is labelled "Azan Jumaat", so the banner the
 * themes build ("{label} dalam N minit") reads "Azan Jumaat dalam 5 minit" (PRD section 5).
 */
function modeTargetView(mode: ModeKey, target: PrayerKey | undefined, waktu: WaktuView[], isFriday: boolean): WaktuView | undefined {
  const w = target ? waktu.find((x) => x.key === target) : undefined;
  if (w && mode === "pre_azan" && isFriday && target === "zohor") return { ...w, label: "Azan Jumaat" };
  return w;
}

export function buildDisplayState(i: DisplayInputs): DisplayState {
  const sched = computeSchedule(
    { today: i.today, tomorrowImsak: i.tomorrowImsak ?? NaN, tomorrowSubuh: i.tomorrowSubuh ?? NaN, forceFriday: i.forceFriday },
    i.at,
  );
  const iqamah = (w: WaktuEntry): string | undefined => {
    if (!isPrayer(w.key) || !Number.isFinite(w.time) || (sched.isFriday && w.key === "zohor")) return undefined;
    const min = i.modeConfig.iqamahMin[w.key];
    return Number.isFinite(min) ? formatTime(w.time + min * 60_000, i.clock24h) : undefined;
  };
  const view = (w: WaktuEntry): WaktuView => ({
    key: w.key,
    label: w.label,
    arabic: w.arabic,
    time: Number.isFinite(w.time) ? formatTime(w.time, i.clock24h) : "–",
    state: w.state,
    isMarker: w.isMarker,
    iqamah: iqamah(w),
  });
  const waktu = sched.waktu.map(view);
  const m =
    i.layout === "poster"
      ? { mode: "normal" as const, target: undefined, remainingSec: undefined, progress: undefined }
      : i.forced
        ? forcedMode(i.forced.mode, i.forced.target, i.forced.sinceMs, i.modeConfig, i.at, sched.isFriday)
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
    modeTarget: modeTargetView(m.mode, m.target, waktu, sched.isFriday),
    modeRemainingSec: m.remainingSec,
    modeProgress: m.progress,
    isFriday: sched.isFriday,
    friday: fridayInfo(i.today, i.modeConfig.durations, i.at, i.clock24h, sched.isFriday),
    masjid: i.masjid,
    showArabic: i.showArabic,
    ticker: i.ticker,
    lite: i.lite,
  };
}