// Text formatting for the display, all in Malaysia local time and BM.
import { localParts, pad2, weekdayOfDateKey } from "./time";

const HARI = ["Ahad", "Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu"];
const BULAN = [
  "Januari", "Februari", "Mac", "April", "Mei", "Jun",
  "Julai", "Ogos", "September", "Oktober", "November", "Disember",
];
const BULAN_HIJRI = [
  "Muharram", "Safar", "Rabiulawal", "Rabiulakhir", "Jamadilawal", "Jamadilakhir",
  "Rejab", "Syaaban", "Ramadan", "Syawal", "Zulkaedah", "Zulhijjah",
];

/** "1:05" (12-hour, no AM/PM: Malaysian masjid convention) or "13:05" when clock24h. */
export function formatTime(ms: number, clock24h = false): string {
  const { hour, minute } = localParts(ms);
  return clock24h ? `${pad2(hour)}:${pad2(minute)}` : `${hour % 12 || 12}:${pad2(minute)}`;
}

/** Seconds part of the clock, "08". */
export function formatSeconds(ms: number): string {
  return pad2(localParts(ms).second);
}

/** "Sabtu, 17 Oktober 2026" */
export function formatGregorian(ms: number): string {
  const p = localParts(ms);
  return `${HARI[p.weekday]}, ${p.day} ${BULAN[p.month - 1]} ${p.year}`;
}

/** API Hijri string "1448-05-06" to "6 Jamadilawal 1448H". Returns "" if unparseable. */
export function formatHijri(hijri: string): string {
  const m = /^(\d{3,4})-(\d{1,2})-(\d{1,2})$/.exec(hijri.trim());
  if (!m) return "";
  const [y, mo, d] = m.slice(1).map(Number);
  if (mo < 1 || mo > 12 || d < 1 || d > 30) return "";
  return `${d} ${BULAN_HIJRI[mo - 1]} ${y}H`;
}

/**
 * Time until the next waktu, in BM: "2 jam 51 minit", "1 jam 01 minit", "49 minit".
 * Rounds up to the whole minute, so it never reads "0 minit" while time remains.
 */
export function formatCountdown(ms: number): string {
  const totalMin = Math.max(0, Math.ceil(ms / 60_000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h} jam ${pad2(m)} minit` : `${m} minit`;
}

/**
 * Seconds as a countdown clock: 600 = "10:00", 59 = "0:59", 3725 = "1:02:05".
 * padMinutes gives "09:52" style (Tenang iqamah).
 */
export function formatMmSs(totalSec: number, padMinutes = false): string {
  const s = Math.max(0, Math.ceil(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${pad2(m)}:${pad2(sec)}`;
  return `${padMinutes ? pad2(m) : m}:${pad2(sec)}`;
}
