// Which waktu is current / next, the colour phase and the countdown, for any instant (PRD section 4).
import { formatCountdown } from "./format";
import { weekdayOfDateKey } from "./time";
import type { DayTimes, PhaseKey, PrayerKey, WaktuKey, WaktuState } from "./types";
import { WAKTU_ORDER, isMarker, waktuName } from "./waktu";

export interface ScheduleInput {
  /** The local day that contains the instant being computed. */
  today: DayTimes;
  /** Imsak of the following day (epoch ms), for the Isyak to Imsak wrap. */
  tomorrowImsak: number;
  /** Debug `day=fri`: force Friday behaviour. */
  forceFriday?: boolean;
}

export interface WaktuEntry {
  key: WaktuKey;
  /** "Zohor", or "Jumaat" on Friday. */
  label: string;
  arabic: string;
  /** Epoch ms. For Imsak after Isyak has passed, this is tomorrow's Imsak. */
  time: number;
  state: WaktuState;
  isMarker: boolean;
}

export interface ScheduleState {
  phase: PhaseKey;
  /** Always 7 entries, in display order. */
  waktu: WaktuEntry[];
  /** Latest passed prayer; undefined between Syuruk and Zohor. Never a marker. */
  current?: WaktuEntry;
  next: WaktuEntry;
  /** True after Isyak, when next is tomorrow's Imsak. */
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
 * The caller passes the day whose local date contains `at`.
 */
export function computeSchedule(input: ScheduleInput, at: number): ScheduleState {
  const t = input.today.times;
  const isFriday = input.forceFriday ?? isFridayDate(input.today.date);

  let lastPassed: WaktuKey | undefined;
  for (const k of WAKTU_ORDER) if (t[k] <= at) lastPassed = k;

  const nextIdx = WAKTU_ORDER.findIndex((k) => t[k] > at);
  const nextIsTomorrow = nextIdx === -1;
  const nextKey: WaktuKey = nextIsTomorrow ? "imsak" : WAKTU_ORDER[nextIdx];
  const nextTime = nextIsTomorrow ? input.tomorrowImsak : t[nextKey];

  // Before Subuh the current prayer is the previous night's Isyak; after Syuruk there is none.
  let currentKey: PrayerKey | undefined;
  if (lastPassed === undefined || lastPassed === "imsak") currentKey = "isyak";
  else if (lastPassed !== "syuruk") currentKey = lastPassed as PrayerKey;

  const waktu: WaktuEntry[] = WAKTU_ORDER.map((key) => {
    const time = key === nextKey ? nextTime : t[key];
    const state: WaktuState =
      key === currentKey ? "current" : key === nextKey ? "next" : time <= at ? "past" : "upcoming";
    return { key, ...waktuName(key, isFriday), time, state, isMarker: isMarker(key) };
  });

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
