// The Android TV app ("shell", android-tv/) and its version (PRD enhancements §8.3, §8.5). Pure: the TV
// page, the admin Skrin page and their tests share it.
//   /tv/?shell=apk&shellv=1.0.0 → app_version "0.1.0 (2026-11-20 10:02)+apk1.0.0"
// The build time stays first, so isOutdated() (src/config/release.ts) keeps working.

/** localStorage key on the TV: the shell seen in the URL, kept for reloads without the query. */
export const SHELL_KEY = "mv:shell";
/** The app download and its manifest, published by .github/workflows/android-tv.yml. */
export const APK_URL = "/apk/masjidview-tv.apk";
export const APK_LATEST_URL = "/apk/latest.json";
/** What people type into the TV's Downloader app. */
export const APK_SHORT_LINK = "masjidview.my/apk";

export interface ShellInfo {
  kind: "apk";
  version: string;
}

const VERSION = /^\d{1,4}(\.\d{1,4}){0,3}$/;

/**
 * The shell for this page load: from the URL when it says so (and the value to store), else the
 * stored one. `?shell=` with anything other than a valid apk version clears it (e.g. `?shell=none`
 * on a PC browser used for a test).
 */
export function resolveShell(search: string, stored: string | null): { shell: ShellInfo | null; store?: string | null } {
  const q = new URLSearchParams(search);
  if (q.has("shell")) {
    const v = q.get("shellv") ?? "";
    if (q.get("shell") === "apk" && VERSION.test(v)) {
      const shell: ShellInfo = { kind: "apk", version: v };
      return { shell, store: JSON.stringify(shell) };
    }
    return { shell: null, store: null };
  }
  try {
    const s = stored ? (JSON.parse(stored) as Partial<ShellInfo>) : null;
    return { shell: s && s.kind === "apk" && typeof s.version === "string" && VERSION.test(s.version) ? { kind: "apk", version: s.version } : null };
  } catch {
    return { shell: null };
  }
}

/** app_version sent with every sync: "<web>+apk<shell>" inside the TV app, else the web version. */
export function appVersionWithShell(web: string, shell: ShellInfo | null): string {
  return shell ? `${web}+apk${shell.version}` : web;
}

/** "0.1.0 (2026-11-20 10:02)+apk1.0.0" → { web: "0.1.0 (2026-11-20 10:02)", apk: "1.0.0" }. */
export function parseAppVersion(v: string | null | undefined): { web: string | null; apk: string | null } {
  if (!v) return { web: null, apk: null };
  const i = v.lastIndexOf("+apk");
  if (i < 0) return { web: v, apk: null };
  const apk = v.slice(i + 4);
  return { web: v.slice(0, i) || null, apk: VERSION.test(apk) ? apk : null };
}

/** Numeric dotted compare: "1.0.10" > "1.0.9"; missing parts count as 0. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

/** public/apk/latest.json */
export interface LatestApk {
  versionCode: number;
  versionName: string;
  sha256: string;
  bytes: number;
  /** ISO time of the build */
  date: string;
  notes: string;
}

export function parseLatestApk(raw: unknown): LatestApk | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.versionCode !== "number" || typeof o.versionName !== "string" || !VERSION.test(o.versionName)) return null;
  if (typeof o.bytes !== "number" || !(o.bytes > 0) || typeof o.date !== "string" || !Number.isFinite(Date.parse(o.date))) return null;
  return {
    versionCode: o.versionCode,
    versionName: o.versionName,
    sha256: typeof o.sha256 === "string" ? o.sha256 : "",
    bytes: o.bytes,
    date: o.date,
    notes: typeof o.notes === "string" ? o.notes : "",
  };
}

/** The screen runs the TV app and a newer one is published ("Kemas kini tersedia"). */
export function apkBehind(appVersion: string | null | undefined, latest: LatestApk | null): boolean {
  const apk = parseAppVersion(appVersion).apk;
  return !!apk && !!latest && compareVersions(apk, latest.versionName) < 0;
}

/** 2_412_544 → "2.3 MB" (1 decimal below 10 MB). */
export function formatMegabytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}
