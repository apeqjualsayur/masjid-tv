// How often a paired TV asks for new content (screen_bundle), PRD usage §7 "Tindakan: egress".
// 60 s normally; 120 s at night, from Isyak + 30 min until Subuh − 30 min, when nobody changes
// announcements and the TV's sync is half the egress. Pure: times in, milliseconds out.

export const SYNC_DAY_MS = 60_000;
export const SYNC_NIGHT_MS = 120_000;
/** Night starts this long after Isyak and ends this long before Subuh. */
export const SYNC_NIGHT_MARGIN_MS = 30 * 60_000;

export interface NightTimes {
  /** Yesterday's Isyak (for the hours after midnight). */
  yesterdayIsyak: number | null;
  todaySubuh: number | null;
  todayIsyak: number | null;
  tomorrowSubuh: number | null;
}

const inNight = (at: number, isyak: number | null, subuh: number | null) => {
  if (isyak == null || subuh == null) return false;
  const from = isyak + SYNC_NIGHT_MARGIN_MS;
  const to = subuh - SYNC_NIGHT_MARGIN_MS;
  return from < to && at >= from && at < to;
};

/** 120 s inside either night window (last night's or tonight's), else 60 s. Missing times = 60 s. */
export function syncIntervalMs(at: number, t: NightTimes | null | undefined): number {
  if (!t) return SYNC_DAY_MS;
  return inNight(at, t.yesterdayIsyak, t.todaySubuh) || inNight(at, t.todayIsyak, t.tomorrowSubuh) ? SYNC_NIGHT_MS : SYNC_DAY_MS;
}
