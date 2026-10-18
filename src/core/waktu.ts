import type { PrayerKey, WaktuKey } from "./types";

/** Display order, PRD §4. */
export const WAKTU_ORDER: readonly WaktuKey[] = ["imsak", "subuh", "syuruk", "zohor", "asar", "maghrib", "isyak"];

export const PRAYER_KEYS: readonly PrayerKey[] = ["subuh", "zohor", "asar", "maghrib", "isyak"];

export function isMarker(key: WaktuKey): boolean {
  return key === "imsak" || key === "syuruk";
}

export function isPrayer(key: WaktuKey): key is PrayerKey {
  return !isMarker(key);
}

const META: Record<WaktuKey, { label: string; arabic: string }> = {
  imsak: { label: "Imsak", arabic: "إمساك" },
  subuh: { label: "Subuh", arabic: "صبح" },
  syuruk: { label: "Syuruk", arabic: "شروق" },
  zohor: { label: "Zohor", arabic: "ظهر" },
  asar: { label: "Asar", arabic: "عصر" },
  maghrib: { label: "Maghrib", arabic: "مغرب" },
  isyak: { label: "Isyak", arabic: "عشاء" },
};

const JUMAAT = { label: "Jumaat", arabic: "جمعة" };

/** BM label and Arabic name. On Friday, Zohor becomes Jumaat. */
export function waktuName(key: WaktuKey, isFriday: boolean): { label: string; arabic: string } {
  return key === "zohor" && isFriday ? JUMAAT : META[key];
}
