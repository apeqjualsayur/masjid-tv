// The TV's device secret, kept in localStorage AND IndexedDB (either survives the other being
// cleared), plus a "paired" marker. The secret never leaves the TV except to the three TV
// functions, which store only its SHA-256 hash (PRD §10).
import { isSecret } from "./logic";

const LS_SECRET = "masjid-view:device-secret";
const LS_PAIRED = "masjid-view:paired-screen";
const DB = "masjid-view-device";
const STORE = "kv";

function idb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbGet(key: string): Promise<unknown> {
  const db = await idb();
  if (!db) return undefined;
  return new Promise((resolve) => {
    try {
      const r = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  }).finally(() => db.close());
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await idb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      if (value === undefined) tx.objectStore(STORE).delete(key);
      else tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
  db.close();
}

const ls = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string | null) => {
    try {
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    } catch {}
  },
};

export interface DeviceStore {
  loadSecret(): Promise<string | null>;
  saveSecret(secret: string): Promise<void>;
  pairedScreen(): string | null;
  markPaired(screenId: string | null): void;
}

export const browserDeviceStore: DeviceStore = {
  async loadSecret() {
    const fromLs = ls.get(LS_SECRET);
    if (isSecret(fromLs)) {
      if (!isSecret(await idbGet("secret"))) await idbSet("secret", fromLs);
      return fromLs;
    }
    const fromIdb = await idbGet("secret");
    if (isSecret(fromIdb)) {
      ls.set(LS_SECRET, fromIdb);
      return fromIdb;
    }
    return null;
  },
  async saveSecret(secret) {
    ls.set(LS_SECRET, secret);
    await idbSet("secret", secret);
  },
  pairedScreen: () => ls.get(LS_PAIRED),
  markPaired: (id) => ls.set(LS_PAIRED, id === null ? null : id || "1"),
};