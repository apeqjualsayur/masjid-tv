// Real API data: GET https://api.waktusolat.app/v2/solat/SGR01?year=2026&month=10 (fetched 2026-10-18),
// days 15-18. Times are Unix epoch seconds. Local (MYT) times for reference:
//   15 Thu, 16 Fri: imsak 5:40, subuh 5:50, syuruk 6:56, zohor 1:02, asar 4:18, maghrib 7:02, isyak 8:11
//   17 Sat, 18 Sun: imsak 5:40, subuh 5:50, syuruk 6:56, zohor 1:01, asar 4:18, maghrib 7:01, isyak 8:11
import type { DayTimes } from "../types";
import type { ScheduleInput } from "../schedule";

const RAW = [
  { day: 15, hijri: "1448-05-04", imsak: 1792014000, fajr: 1792014600, syuruk: 1792018560, dhuha: 1792020060, dhuhr: 1792040520, asr: 1792052280, maghrib: 1792062120, isha: 1792066260 },
  { day: 16, hijri: "1448-05-05", imsak: 1792100400, fajr: 1792101000, syuruk: 1792104960, dhuha: 1792106460, dhuhr: 1792126920, asr: 1792138680, maghrib: 1792148520, isha: 1792152660 },
  { day: 17, hijri: "1448-05-06", imsak: 1792186800, fajr: 1792187400, syuruk: 1792191360, dhuha: 1792192860, dhuhr: 1792213260, asr: 1792225080, maghrib: 1792234860, isha: 1792239060 },
  { day: 18, hijri: "1448-05-07", imsak: 1792273200, fajr: 1792273800, syuruk: 1792277760, dhuha: 1792279260, dhuhr: 1792299660, asr: 1792311480, maghrib: 1792321260, isha: 1792325460 },
];

export function dayTimes(day: 15 | 16 | 17 | 18): DayTimes {
  const r = RAW.find((x) => x.day === day)!;
  const ms = (s: number) => s * 1000;
  return {
    date: `2026-10-${day}`,
    hijri: r.hijri,
    times: {
      imsak: ms(r.imsak),
      subuh: ms(r.fajr),
      syuruk: ms(r.syuruk),
      zohor: ms(r.dhuhr),
      asar: ms(r.asr),
      maghrib: ms(r.maghrib),
      isyak: ms(r.isha),
    },
  };
}

export function scheduleInput(day: 15 | 16 | 17, forceFriday?: boolean): ScheduleInput {
  const next = dayTimes((day + 1) as 16 | 17 | 18).times;
  return { today: dayTimes(day), tomorrowImsak: next.imsak, tomorrowSubuh: next.subuh, forceFriday };
}

/** screen.json defaults (PRD 9.4). */
export const CONFIG = {
  durations: { preAzanMin: 5, azanMin: 3, solatMin: 12, khutbahMin: 40 },
  iqamahMin: { subuh: 10, zohor: 10, asar: 10, maghrib: 7, isyak: 10 },
};
