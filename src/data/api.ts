// waktusolat.app client (PRD section 9.1). Converts API responses into the engine's
// DayTimes (epoch ms) and checks the time unit of the response.
import { localToEpoch, type DayTimes, type WaktuKey } from "@/core";
import type { FetchLike, MonthData } from "./types";
import { dateKeyOf, isValidMonth } from "./validate";

export const API_BASE = "https://api.waktusolat.app";

/** API field for each waktu. */
const API_FIELDS: Record<WaktuKey, string> = {
  imsak: "imsak",
  subuh: "fajr",
  syuruk: "syuruk",
  zohor: "dhuhr",
  asar: "asr",
  maghrib: "maghrib",
  isyak: "isha",
};

export type TimeUnit = "epoch_s" | "epoch_ms" | "clock_string";

/**
 * The service worker marks answers it served from its cache (offline). Those must not count as a
 * fresh sync: months stay "cache" in IndexedDB, and a cached /chrono would give a wrong clock offset.
 */
export const SW_CACHE_HEADER = "x-sw-cache";
export const fromServiceWorkerCache = (res: Response) => res.headers.get(SW_CACHE_HEADER) === "hit";

const log = (msg: string, ...rest: unknown[]) => console.warn(`[masjid-tv/data] ${msg}`, ...rest);
let unitChecked = false;

/** How a raw API time value is encoded. Spec says epoch seconds; anything else is adapted and logged. */
export function detectTimeUnit(value: unknown): TimeUnit | null {
  const n = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  if (typeof n === "number" && Number.isFinite(n)) {
    if (n >= 1e9 && n < 1e10) return "epoch_s";
    if (n >= 1e12 && n < 1e13) return "epoch_ms";
    return null;
  }
  if (typeof value === "string" && /^\d{1,2}:\d{2}(:\d{2})?$/.test(value.trim())) return "clock_string";
  return null;
}

function toEpochMs(value: unknown, unit: TimeUnit, year: number, month: number, day: number): number {
  if (unit === "epoch_s") return Number(value) * 1000;
  if (unit === "epoch_ms") return Number(value);
  const [h, m, s = 0] = String(value).trim().split(":").map(Number);
  return localToEpoch(year, month, day, h, m, s);
}

interface RawDay {
  day: number;
  hijri: string;
  [field: string]: unknown;
}

/** Turn one API month response into MonthData. Throws if it cannot be trusted. */
export function parseMonthResponse(raw: unknown, zone: string, year: number, month: number, fetchedAt: number): MonthData {
  zone = zone.toUpperCase();
  const r = raw as { zone?: string; prayers?: RawDay[] };
  if (!r || !Array.isArray(r.prayers) || r.prayers.length === 0) throw new Error(`No prayers in response for ${zone} ${year}-${month}`);
  if (r.zone && r.zone.toUpperCase() !== zone.toUpperCase()) throw new Error(`Response zone ${r.zone} does not match ${zone}`);

  const unit = detectTimeUnit(r.prayers[0].imsak);
  if (!unit) throw new Error(`Unrecognised time format in API response: ${JSON.stringify(r.prayers[0].imsak)}`);
  if (unit !== "epoch_s") log(`API times are "${unit}", not Unix epoch seconds as the spec says. Converting.`);
  else if (!unitChecked) console.info("[masjid-tv/data] Verified: API times are Unix epoch seconds.");
  unitChecked = true;

  const days: DayTimes[] = [...r.prayers]
    .sort((a, b) => a.day - b.day)
    .map((p) => {
      const times = {} as Record<WaktuKey, number>;
      for (const [key, field] of Object.entries(API_FIELDS) as [WaktuKey, string][]) {
        times[key] = toEpochMs(p[field], unit, year, month, p.day);
      }
      return { date: dateKeyOf(year, month, p.day), hijri: String(p.hijri ?? ""), times };
    });

  const data: MonthData = { zone, year, month, fetchedAt, days };
  if (!isValidMonth(data, zone, year, month)) {
    throw new Error(`API data for ${zone} ${year}-${month} failed validation (missing days, wrong dates or out-of-order times)`);
  }
  return data;
}

export async function fetchMonth(
  zone: string,
  year: number,
  month: number,
  fetchImpl: FetchLike = fetch,
  realNow: () => number = Date.now,
): Promise<MonthData> {
  zone = zone.toUpperCase();
  const url = `${API_BASE}/v2/solat/${encodeURIComponent(zone)}?year=${year}&month=${month}`;
  const res = await fetchImpl(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET ${url} failed: HTTP ${res.status}`);
  if (fromServiceWorkerCache(res)) throw new Error(`GET ${url}: offline (answered from the service worker cache)`);
  return parseMonthResponse(await res.json(), zone, year, month, realNow());
}

/**
 * GET /chrono and compute offset = serverTime - device time (PRD section 9.3).
 * Uses the request midpoint to cancel out network delay.
 */
export async function fetchClockOffset(fetchImpl: FetchLike = fetch, realNow: () => number = Date.now): Promise<number> {
  const sent = realNow();
  const res = await fetchImpl(`${API_BASE}/chrono`, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET /chrono failed: HTTP ${res.status}`);
  if (fromServiceWorkerCache(res)) throw new Error("GET /chrono: offline (cached time is never used)");
  const body = (await res.json()) as { unix?: unknown };
  const received = realNow();
  if (typeof body.unix !== "number" || detectTimeUnit(body.unix) !== "epoch_s") {
    throw new Error(`Unexpected /chrono response: ${JSON.stringify(body)}`);
  }
  // /chrono has whole-second resolution, so the true server time is on average half a second later.
  return body.unix * 1000 + 500 - (sent + received) / 2;
}
