// TV content sync (PRD Phase 2 §7): every 60 s screen_bundle(secret, lastVersion, appVersion).
// 'ok' → validate, store in IndexedDB, apply; 'unchanged' → nothing; 'revoked' → wipe;
// 'suspended' → calm screen. Boot starts from the stored bundle, so a network error never blanks
// the screen. Pure parts are exported for tests; I/O is injected.
import type { PlaylistItem } from "@/core";
import type { SlideView } from "@/templates";
import { parseSlides, type RawSlide } from "./slides";

export interface BundleScreen {
  id: string;
  name: string;
  theme: string;
  layout: string;
}
export interface BundleOrg {
  fullName: string;
  shortName: string;
  kind: string;
  zone: string;
  accentColor: string | null;
  logoPath: string | null;
}
export interface BundleSettings {
  iqamahMin: Record<string, unknown>;
  durations: Record<string, unknown>;
  clock24h: boolean;
  showArabic: boolean;
  ticker: string[];
}
export interface BundleSlide {
  id: string;
  type: string;
  templateKey: string | null;
  fields: Record<string, unknown>;
  startsAt: string | null;
  endsAt: string | null;
  durationS: number | null;
  /** Database weekdays: 1 = Isnin … 7 = Ahad; null = every day. */
  daysOfWeek: number[] | null;
  priority: boolean;
  sortOrder: number;
  media: { path: string; width: number; height: number } | null;
}
export interface Bundle {
  version: number;
  screen: BundleScreen;
  org: BundleOrg;
  settings: BundleSettings;
  slides: BundleSlide[];
}

export type BundleAnswer =
  | { kind: "ok"; bundle: Bundle }
  | { kind: "unchanged"; version: number }
  | { kind: "revoked" }
  | { kind: "suspended" }
  | { kind: "invalid"; reason: string };

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const s = (v: unknown) => (typeof v === "string" ? v : null);

/** Shape check of one screen_bundle answer. Field values are checked again when mapped. */
export function parseBundleAnswer(raw: unknown): BundleAnswer {
  if (!isObj(raw)) return { kind: "invalid", reason: "not an object" };
  if (raw.status === "revoked") return { kind: "revoked" };
  if (raw.status === "suspended") return { kind: "suspended" };
  if (raw.status === "unchanged") {
    return typeof raw.version === "number" ? { kind: "unchanged", version: raw.version } : { kind: "invalid", reason: "unchanged without version" };
  }
  if (raw.status !== "ok") return { kind: "invalid", reason: `unknown status ${String(raw.status)}` };
  const { version, screen, org, settings, slides } = raw;
  if (typeof version !== "number" || !Number.isFinite(version)) return { kind: "invalid", reason: "version" };
  if (!isObj(screen) || !s(screen.id) || !s(screen.name)) return { kind: "invalid", reason: "screen" };
  if (!isObj(org) || !s(org.fullName) || !s(org.shortName) || !s(org.zone)) return { kind: "invalid", reason: "org" };
  if (!isObj(settings)) return { kind: "invalid", reason: "settings" };
  if (!Array.isArray(slides)) return { kind: "invalid", reason: "slides" };
  return {
    kind: "ok",
    bundle: {
      version,
      screen: { id: s(screen.id)!, name: s(screen.name)!, theme: s(screen.theme) ?? "", layout: s(screen.layout) ?? "" },
      org: {
        fullName: s(org.fullName)!,
        shortName: s(org.shortName)!,
        kind: s(org.kind) ?? "masjid",
        zone: s(org.zone)!,
        accentColor: s(org.accentColor),
        logoPath: s(org.logoPath),
      },
      settings: {
        iqamahMin: isObj(settings.iqamahMin) ? settings.iqamahMin : {},
        durations: isObj(settings.durations) ? settings.durations : {},
        clock24h: settings.clock24h === true,
        showArabic: settings.showArabic !== false,
        ticker: Array.isArray(settings.ticker) ? settings.ticker.filter((t): t is string => typeof t === "string") : [],
      },
      slides: slides.filter(isObj).map((x) => ({
        id: s(x.id) ?? "",
        type: s(x.type) ?? "",
        templateKey: s(x.templateKey),
        fields: isObj(x.fields) ? x.fields : {},
        startsAt: s(x.startsAt),
        endsAt: s(x.endsAt),
        durationS: typeof x.durationS === "number" ? x.durationS : null,
        daysOfWeek: Array.isArray(x.daysOfWeek) ? x.daysOfWeek.filter((d): d is number => typeof d === "number") : null,
        priority: x.priority === true,
        sortOrder: typeof x.sortOrder === "number" ? x.sortOrder : 0,
        media: isObj(x.media) && s(x.media.path) ? { path: s(x.media.path)!, width: Number(x.media.width) || 0, height: Number(x.media.height) || 0 } : null,
      })),
    },
  };
}

/** Database weekdays are 1 = Isnin … 7 = Ahad; the playlist uses 0 = Ahad … 6 = Sabtu. */
export function dbDaysToPlaylist(days: number[] | null): number[] | undefined {
  if (!days || days.length === 0) return undefined;
  return days.map((d) => d % 7);
}

/** Public URL of a file in the 'media' bucket. */
export function mediaUrl(supabaseUrl: string, path: string): string {
  return `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/media/${path.split("/").map(encodeURIComponent).join("/")}`;
}

/** Postgres timestamptz in JSON ("2026-10-22T10:00:00.123456+00:00") → ISO the playlist parses. */
export function isoForPlaylist(v: string | null): string | undefined {
  if (!v) return undefined;
  return v.trim().replace(" ", "T").replace(/\.(\d{3})\d+/, ".$1");
}

/** Bundle slides → playlist items, through the same validation as Phase 1 slides. */
export function bundleSlides(b: Bundle, supabaseUrl: string): { items: PlaylistItem<SlideView>[]; warnings: string[] } {
  const raw: RawSlide[] = b.slides.map((x) => ({
    id: x.id,
    type: x.type as RawSlide["type"],
    template_key: (x.templateKey ?? undefined) as RawSlide["template_key"],
    fields: x.fields,
    image_url: x.media ? mediaUrl(supabaseUrl, x.media.path) : undefined,
    starts_at: isoForPlaylist(x.startsAt),
    ends_at: isoForPlaylist(x.endsAt),
    duration_s: x.durationS ?? undefined,
    days_of_week: dbDaysToPlaylist(x.daysOfWeek),
    priority: x.priority,
    sort_order: x.sortOrder,
    status: "active",
  }));
  const r = parseSlides(raw);
  return { items: r.items, warnings: r.warnings.map((w) => w.replace("sample-slides.json", "bundle")) };
}

/** Every image the current bundle needs offline: the logo and the posters. */
export function referencedMedia(b: Bundle, supabaseUrl: string): string[] {
  const urls = new Set<string>();
  if (b.org.logoPath) urls.add(mediaUrl(supabaseUrl, b.org.logoPath));
  for (const x of b.slides) if (x.media) urls.add(mediaUrl(supabaseUrl, x.media.path));
  return [...urls];
}

// ------------------------------------------------------------------ storage

export interface StoredBundle {
  bundle: Bundle;
  savedAt: number;
  suspended: boolean;
}
export interface BundleStore {
  get(): Promise<StoredBundle | null>;
  put(v: StoredBundle): Promise<void>;
  clear(): Promise<void>;
}

const DB = "masjid-view-bundle";
const STORE = "kv";
const KEY = "current";

function openDb(idb: IDBFactory): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const req = idb.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/** The last good bundle in IndexedDB (survives reboots; read first on every boot). */
export function idbBundleStore(idb: IDBFactory | undefined = globalThis.indexedDB): BundleStore {
  const run = async <T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest | void): Promise<T | undefined> => {
    if (!idb) return undefined;
    const db = await openDb(idb);
    if (!db) return undefined;
    return new Promise<T | undefined>((resolve) => {
      try {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(req ? (req.result as T) : undefined);
        tx.onerror = () => resolve(undefined);
        tx.onabort = () => resolve(undefined);
      } catch {
        resolve(undefined);
      }
    }).finally(() => db.close());
  };
  return {
    async get() {
      const v = await run<StoredBundle>("readonly", (s) => s.get(KEY));
      if (!v || !isObj(v) || !isObj((v as StoredBundle).bundle)) return null;
      // Re-check the stored copy: a corrupted entry must not break the boot.
      const again = parseBundleAnswer({ status: "ok", ...(v as StoredBundle).bundle });
      return again.kind === "ok" ? { bundle: again.bundle, savedAt: Number(v.savedAt) || 0, suspended: v.suspended === true } : null;
    },
    async put(v) {
      await run("readwrite", (s) => s.put(v, KEY));
    },
    async clear() {
      await run("readwrite", (s) => s.delete(KEY));
    },
  };
}

// ------------------------------------------------------------------ sync loop

export type BundleStatus = "starting" | "ok" | "unchanged" | "offline" | "invalid" | "suspended" | "revoked";

export interface BundleState {
  bundle: Bundle | null;
  /** Where the bundle on screen came from. */
  from: "cache" | "live" | null;
  status: BundleStatus;
  /** Masjid suspended: only a later 'ok' / 'unchanged' answer clears it (never a network error). */
  suspended: boolean;
  /** Last answer from the server (any status), epoch ms. */
  lastSync: number | null;
  error: string | null;
}

export interface BundleSyncDeps {
  /** screen_bundle(secret, since, appVersion) */
  call: (since: number) => Promise<{ data: unknown; error: { message: string } | null }>;
  store: BundleStore;
  onState: (s: BundleState) => void;
  now?: () => number;
  intervalMs?: number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (t: unknown) => void;
}

export const BUNDLE_INTERVAL_MS = 60_000;

export function startBundleSync(d: BundleSyncDeps): { ready: Promise<void>; syncNow: () => Promise<void>; stop: () => void } {
  const now = d.now ?? Date.now;
  const setTimer = d.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = d.clearTimer ?? ((t) => clearTimeout(t as ReturnType<typeof setTimeout>));
  const interval = d.intervalMs ?? BUNDLE_INTERVAL_MS;
  let state: BundleState = { bundle: null, from: null, status: "starting", suspended: false, lastSync: null, error: null };
  let stopped = false;
  let timer: unknown = null;
  let busy = false;

  const emit = (patch: Partial<BundleState>) => {
    state = { ...state, ...patch };
    if (!stopped) d.onState(state);
  };
  const schedule = () => {
    if (stopped || state.status === "revoked") return;
    timer = setTimer(() => {
      timer = null;
      void tick().then(schedule);
    }, interval);
  };

  async function tick() {
    if (stopped || busy || state.status === "revoked") return;
    busy = true;
    try {
      let res: { data: unknown; error: { message: string } | null };
      try {
        res = await d.call(state.bundle?.version ?? 0);
      } catch (e) {
        res = { data: null, error: { message: (e as Error)?.message ?? String(e) } };
      }
      if (stopped) return;
      if (res.error) return emit({ status: "offline", error: res.error.message });
      const a = parseBundleAnswer(res.data);
      const t = now();
      if (a.kind === "ok") {
        await d.store.put({ bundle: a.bundle, savedAt: t, suspended: false });
        emit({ bundle: a.bundle, from: "live", status: "ok", suspended: false, lastSync: t, error: null });
      } else if (a.kind === "unchanged") {
        if (state.suspended && state.bundle) await d.store.put({ bundle: state.bundle, savedAt: t, suspended: false });
        emit({ status: "unchanged", suspended: false, lastSync: t, error: null });
      } else if (a.kind === "suspended") {
        if (state.bundle) await d.store.put({ bundle: state.bundle, savedAt: t, suspended: true });
        emit({ status: "suspended", suspended: true, lastSync: t, error: null });
      } else if (a.kind === "revoked") {
        await d.store.clear();
        emit({ bundle: null, from: null, status: "revoked", suspended: false, lastSync: t, error: null });
      } else {
        emit({ status: "invalid", lastSync: t, error: a.reason });
      }
    } finally {
      busy = false;
    }
  }

  const ready = (async () => {
    const cached = await d.store.get().catch(() => null);
    if (stopped) return;
    if (cached) emit({ bundle: cached.bundle, from: "cache", status: "starting", suspended: cached.suspended });
    await tick();
    schedule();
  })();

  return {
    ready,
    syncNow: tick,
    stop() {
      stopped = true;
      if (timer !== null) clearTimer(timer);
      timer = null;
    },
  };
}