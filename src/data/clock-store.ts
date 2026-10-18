// Persists the /chrono clock offset so the clock stays correct across reloads while offline.
import { setClockOffset } from "@/core";

const KEY = "masjid-tv:clock";

export interface StoredClock {
  offsetMs: number;
  /** Real epoch ms of the last successful /chrono sync. */
  syncedAt: number;
}

/** Minimal Storage subset, so tests can pass a fake. */
export type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;

function defaultStorage(): KeyValueStorage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadStoredClock(storage = defaultStorage()): StoredClock | null {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as StoredClock;
    return Number.isFinite(v.offsetMs) && Number.isFinite(v.syncedAt) ? v : null;
  } catch {
    return null;
  }
}

export function saveStoredClock(value: StoredClock, storage = defaultStorage()): void {
  try {
    storage?.setItem(KEY, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the in-memory offset still applies until reload.
  }
}

/** On boot: apply the last known offset to now() before any network call. */
export function restoreClockOffset(storage = defaultStorage()): StoredClock | null {
  const stored = loadStoredClock(storage);
  if (stored) setClockOffset(stored.offsetMs);
  return stored;
}
