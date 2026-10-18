// Which waktu is current / next, the colour phase and the countdown, for any instant (PRD section 4).
import { formatCountdown } from "./format";
import { weekdayOfDateKey } from "./time";
import type { DayTimes, PhaseKey, PrayerKey, WaktuKey, WaktuState } from "./types";
import { PRAYER_KEYS, WAKTU_ORDER, isMarker, waktuName } from "./waktu";

export interface ScheduleInput {
  /** The local day that contains the instant being computed. */
  today: DayTimes;
  /** Imsak of the following day (epoch ms): shown in the Imsak row once Isyak has passed. */
  tomorrowImsak: number;
  /** Subuh of the following day (epoch ms): the next prayer after Isyak. */
  tomorrowSubuh: number;
  /** Debug `day=fri`: force Friday behaviour. */
  forceFriday?: boolean;
}

export interface WaktuEntry {
  key: WaktuKey;
  /** "Zohor", or "Jumaat" on Friday. */
  label: string;
  arabic: string;
  /** Epoch ms. After Isyak, Imsak and Subuh show tomorrow's times. */
  time: number;
  /** Markers (Imsak, Syuruk) are only ever "past" or "upcoming". */
  state: WaktuState;
  isMarker: boolean;
}

export interface ScheduleState {
  phase: PhaseKey;
  /** Always 7 entries, in display order. */
  waktu: WaktuEntry[];
  /** Latest passed prayer; undefined between Syuruk and Zohor. Never a marker. */
  current?: WaktuEntry;
  /** Next prayer. Never a marker. */
  next: WaktuEntry;
  /** True after Isyak, when next is tomorrow's Subuh. */
  nextIsTomorrow: boolean;
  msToNext: number;
  /** "2 jam 51 minit" */
  countdownText: string;
  isFriday: boolean;
}

export function isFridayDate(dateKey: string): boolean {
  return weekdayOfDateKey(dateKey) === 5;
}

/** Colour phase: Imsak-Syuruk subuh, Syuruk-Asar zohor, Asar-Maghrib asar, Maghrib-Isyak maghrib, Isyak-Imsak isyak. */
export function phaseAt(times: Record<WaktuKey, number>, at: number): PhaseKey {
  if (at < times.imsak) return "isyak";
  if (at < times.syuruk) return "subuh";
  if (at < times.asar) return "zohor";
  if (at < times.maghrib) return "asar";
  if (at < times.isyak) return "maghrib";
  return "isyak";
}

/**
 * A waktu counts as passed from its exact second onwards (time <= at).
 * Next is the next prayer (markers are reference rows only, PRD section 4).
 * The caller passes the day whose local date contains `at`.
 */
export function computeSchedule(input: ScheduleInput, at: number): ScheduleState {
  const t = input.today.times;
  const isFriday = input.forceFriday ?? isFridayDate(input.today.date);

  let lastPassed: WaktuKey | undefined;
  for (const k of WAKTU_ORDER) if (t[k] <= at) lastPassed = k;

  const nextPrayer = PRAYER_KEYS.find((k) => t[k] > at);
  const nextIsTomorrow = nextPrayer === undefined;
  const nextKey: PrayerKey = nextPrayer ?? "subuh";

  // Before Subuh the current prayer is the previous night's Isyak; after Syuruk there is none.
  let currentKey: PrayerKey | undefined;
  if (lastPassed === undefined || lastPassed === "imsak") currentKey = "isyak";
  else if (lastPassed !== "syuruk") currentKey = lastPassed as PrayerKey;

  // After Isyak the morning rows show tomorrow's times (and are upcoming again).
  const timeOf = (key: WaktuKey) =>
    nextIsTomorrow && key === "imsak" ? input.tomorrowImsak : nextIsTomorrow && key === "subuh" ? input.tomorrowSubuh : t[key];

  const waktu: WaktuEntry[] = WAKTU_ORDER.map((key) => {
    const time = timeOf(key);
    const tomorrow = nextIsTomorrow && (key === "imsak" || key === "subuh");
    const state: WaktuState =
      key === currentKey ? "current" : key === nextKey ? "next" : !tomorrow && time <= at ? "past" : "upcoming";
    return { key, ...waktuName(key, isFriday), time, state, isMarker: isMarker(key) };
  });

  const nextTime = timeOf(nextKey);
  const msToNext = Math.max(0, nextTime - at);
  return {
    phase: phaseAt(t, at),
    waktu,
    current: waktu.find((w) => w.state === "current"),
    next: waktu.find((w) => w.state === "next")!,
    nextIsTomorrow,
    msToNext,
    countdownText: formatCountdown(msToNext),
    isFriday,
  };
}