// IndexedDB month cache keyed "zone:YYYY-MM", plus the sync schedule (PRD section 9.2-9.3):
// fetch current + next month on boot and daily at 00:10, re-sync /chrono every 30 min.
import { getClockOffset, localParts, localToEpoch, setClockOffset } from "@/core";
import { fetchClockOffset, fetchMonth } from "./api";
import { saveStoredClock, type KeyValueStorage } from "./clock-store";
import type { FetchLike, MonthData } from "./types";

export interface MonthStore {
  get(key: string): Promise<unknown>;
  put(key: string, value: MonthData): Promise<void>;
  delete(key: string): Promise<void>;
}

export function monthKey(zone: string, year: number, month: number): string {
  return `${zone.toUpperCase()}:${year}-${String(month).padStart(2, "0")}`;
}

const DB_NAME = "masjid-tv";
const STORE = "months";

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

/** IndexedDB-backed store. Any IndexedDB failure on read behaves like an empty cache, never a crash. */
export function idbMonthStore(idb: IDBFactory | undefined = globalThis.indexedDB): MonthStore {
  let dbp: Promise<IDBDatabase> | null = null;
  const db = () =>
    (dbp ??= new Promise<IDBDatabase>((resolve, reject) => {
      if (!idb) return reject(new Error("IndexedDB not available"));
      const open = idb.open(DB_NAME, 1);
      open.onupgradeneeded = () => open.result.createObjectStore(STORE);
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
      open.onblocked = () => reject(new Error("IndexedDB blocked"));
    }).catch((e) => {
      dbp = null; // allow a retry later
      throw e;
    }));
  const objectStore = async (mode: IDBTransactionMode) => (await db()).transaction(STORE, mode).objectStore(STORE);

  return {
    async get(key) {
      try {
        return await req((await objectStore("readonly")).get(key));
      } catch (e) {
        console.warn("[masjid-tv/data] IndexedDB read failed", e);
        return undefined;
      }
    },
    async put(key, value) {
      await req((await objectStore("readwrite")).put(value, key));
    },
    async delete(key) {
      try {
        await req((await objectStore("readwrite")).delete(key));
      } catch {
        // ignore: a bad entry is also rejected on every read
      }
    },
  };
}

/** The month containing `atMs` and the month after it (local Malaysia time). */
export function currentAndNextMonth(atMs: number): { year: number; month: number }[] {
  const { year, month } = localParts(atMs);
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  return [{ year, month }, next];
}

/** Fetch current + next month and store them. Months that fail are reported, not thrown. */
export async function refreshMonths(
  zone: string,
  atMs: number,
  store: MonthStore,
  fetchImpl: FetchLike = fetch,
  realNow: () => number = Date.now,
): Promise<{ stored: string[]; failed: { key: string; error: unknown }[] }> {
  const stored: string[] = [];
  const failed: { key: string; error: unknown }[] = [];
  for (const { year, month } of currentAndNextMonth(atMs)) {
    const key = monthKey(zone, year, month);
    try {
      await store.put(key, await fetchMonth(zone, year, month, fetchImpl, realNow));
      stored.push(key);
    } catch (error) {
      failed.push({ key, error });
    }
  }
  return { stored, failed };
}

/** Milliseconds from `atMs` until the next local hh:mm. */
export function msUntilNextLocal(atMs: number, hour: number, minute: number): number {
  const p = localParts(atMs);
  let target = localToEpoch(p.year, p.month, p.day, hour, minute, 0);
  if (target <= atMs) target = localToEpoch(p.year, p.month, p.day + 1, hour, minute, 0);
  return target - atMs;
}

export const CLOCK_RESYNC_MS = 30 * 60_000;

export interface SyncOptions {
  zone: string;
  store: MonthStore;
  fetchImpl?: FetchLike;
  realNow?: () => number;
  storage?: KeyValueStorage | null;
  /** Called after months were stored (e.g. to re-read today's data). */
  onMonths?: (storedKeys: string[]) => void;
  onClock?: (offsetMs: number) => void;
  /** Last successful clock sync from an earlier session (restoreClockOffset), shown until a new one. */
  initialClockSync?: number | null;
}

export interface SyncStatus {
  lastDataSync: number | null;
  lastClockSync: number | null;
  /** Keys fetched and stored by this session (reported as source "live"). */
  liveKeys: Set<string>;
}

/**
 * Boot + background sync. Uses real (offset-corrected) time, not the debug sim, so
 * simulating another date never fetches the wrong months. If a month refresh fails
 * (offline), it is retried on each 30-minute clock tick until it succeeds.
 */
export function startSync(opts: SyncOptions): { status: SyncStatus; ready: Promise<void>; stop: () => void } {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const realNow = opts.realNow ?? Date.now;
  const correctedNow = () => realNow() + getClockOffset();
  const status: SyncStatus = { lastDataSync: null, lastClockSync: opts.initialClockSync ?? null, liveKeys: new Set() };
  let monthsPending = true;
  let stopped = false;
  let dailyTimer: ReturnType<typeof setTimeout> | undefined;

  const syncClock = async () => {
    try {
      const offsetMs = await fetchClockOffset(fetchImpl, realNow);
      setClockOffset(offsetMs);
      status.lastClockSync = realNow();
      saveStoredClock({ offsetMs, syncedAt: status.lastClockSync }, opts.storage);
      opts.onClock?.(offsetMs);
    } catch (e) {
      console.warn("[masjid-tv/data] clock sync failed", e);
    }
  };

  const syncMonths = async () => {
    const { stored, failed } = await refreshMonths(opts.zone, correctedNow(), opts.store, fetchImpl, realNow);
    for (const k of stored) status.liveKeys.add(k);
    if (stored.length) status.lastDataSync = realNow();
    monthsPending = failed.length > 0;
    if (failed.length) console.warn("[masjid-tv/data] month refresh failed", failed);
    if (stored.length) opts.onMonths?.(stored);
  };

  const scheduleDaily = () => {
    dailyTimer = setTimeout(async () => {
      if (stopped) return;
      await syncMonths();
      if (!stopped) scheduleDaily();
    }, msUntilNextLocal(correctedNow(), 0, 10));
  };

  const ready = (async () => {
    await syncClock(); // first, so month selection uses the corrected date
    await syncMonths();
  })();
  scheduleDaily();
  const clockTimer = setInterval(async () => {
    if (stopped) return;
    await syncClock();
    if (monthsPending && !stopped) await syncMonths();
  }, CLOCK_RESYNC_MS);

  return {
    status,
    ready,
    stop() {
      stopped = true;
      clearTimeout(dailyTimer);
      clearInterval(clockTimer);
    },
  };
}
