// TV pairing rules (PRD Phase 2 §4.4). Pure: no React, no network, no storage.
import qrcode from "qrcode-generator";

/** 64 hex characters (32 random bytes). */
export function newSecret(getRandomValues: (a: Uint8Array) => Uint8Array = (a) => crypto.getRandomValues(a)): string {
  return Array.from(getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, "0")).join("");
}

export const isSecret = (s: unknown): s is string => typeof s === "string" && /^[0-9a-f]{64}$/.test(s);

/** What the phone opens from the QR: the admin Skrin page with the code pre-filled. */
export function pairUrl(origin: string, code: string): string {
  return `${origin.replace(/\/+$/, "")}/admin/skrin/?pair=${code}`;
}

/** QR modules (true = dark) for a text, error correction M. */
export function qrModules(text: string): boolean[][] {
  const qr = qrcode(0, "M");
  qr.addData(text, "Byte");
  qr.make();
  const n = qr.getModuleCount();
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => qr.isDark(r, c)));
}

/** "9:42" until the code expires (never negative). */
export function countdown(expiresAtMs: number, nowMs: number): string {
  const s = Math.max(0, Math.ceil((expiresAtMs - nowMs) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export type PairView =
  | { kind: "starting" }
  | { kind: "waiting"; code: string; expiresAt: number }
  | { kind: "paired"; screenId: string | null }
  | { kind: "offline" }
  | { kind: "error" };

/** What to do next after an answer from the database. */
export type PairStep =
  | { view: PairView; next: "poll" | "start" | "none" }
  | { view: PairView; next: "rotate" }; // new secret: this one can never pair again

/** pair_start(secret) answer. */
export function afterStart(r: unknown): PairStep {
  const x = (r ?? {}) as { status?: string; code?: string; expires_at?: string };
  if (x.status === "already_paired") return { view: { kind: "paired", screenId: null }, next: "none" };
  if (x.status === "waiting" && typeof x.code === "string" && /^\d{6}$/.test(x.code)) {
    const exp = Date.parse(x.expires_at ?? "");
    return { view: { kind: "waiting", code: x.code, expiresAt: Number.isFinite(exp) ? exp : 0 }, next: "poll" };
  }
  return { view: { kind: "error" }, next: "start" };
}

/** pair_status(secret) answer while a code is shown. */
export function afterStatus(r: unknown, current: PairView): PairStep {
  const x = (r ?? {}) as { status?: string; screen_id?: string; code?: string };
  if (x.status === "paired") return { view: { kind: "paired", screenId: typeof x.screen_id === "string" ? x.screen_id : null }, next: "none" };
  if (x.status === "expired" || x.status === "unknown") return { view: current, next: "start" };
  // A code we are not showing means it was claimed for a screen that no longer exists.
  if (x.status === "waiting" && current.kind === "waiting" && x.code && x.code !== current.code) return { view: current, next: "rotate" };
  return { view: current, next: "poll" };
}

/**
 * Error from pair_start: 'busy' for a secret whose old claimed code still exists (its screen was
 * deleted or revoked) means this secret can never get a new code: rotate it.
 */
export function afterStartError(message: string, online: boolean, rotatedAlready: boolean): PairStep {
  if (!online) return { view: { kind: "offline" }, next: "start" };
  if (/busy/.test(message) && !rotatedAlready) return { view: { kind: "starting" }, next: "rotate" };
  return { view: { kind: "error" }, next: "start" };
}

export const POLL_MS = 5_000;
export const RETRY_MS = 10_000;
export const PAIRED_CHECK_MS = 60_000;