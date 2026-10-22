// Drives the pairing screen: pair_start → show code → pair_status every 5 s → new code on expiry.
// Dependencies are injected so the whole flow is unit-tested (runner.test.ts).
import type { DeviceStore } from "./device";
import { POLL_MS, RETRY_MS, afterStart, afterStartError, afterStatus, newSecret, type PairStep, type PairView } from "./logic";

export type Rpc = (fn: "pair_start" | "pair_status", args: { p_secret: string }) => Promise<{ data: unknown; error: { message: string } | null }>;

export interface RunnerDeps {
  rpc: Rpc;
  store: DeviceStore;
  now: () => number;
  online: () => boolean;
  onView: (v: PairView) => void;
  onPaired: (secret: string, screenId: string | null) => void;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (t: unknown) => void;
  makeSecret?: () => string;
}

export function createPairingRunner(d: RunnerDeps) {
  const setTimer = d.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = d.clearTimer ?? ((t) => clearTimeout(t as ReturnType<typeof setTimeout>));
  const makeSecret = d.makeSecret ?? (() => newSecret());
  let secret = "";
  let view: PairView = { kind: "starting" };
  let timer: unknown = null;
  let stopped = false;
  let rotated = false;

  const show = (v: PairView) => {
    view = v;
    d.onView(v);
  };
  const later = (fn: () => void, ms: number) => {
    if (stopped) return;
    if (timer !== null) clearTimer(timer);
    timer = setTimer(() => {
      timer = null;
      if (!stopped) fn();
    }, ms);
  };

  async function apply(s: PairStep) {
    if (stopped) return;
    show(s.view);
    if (s.next === "rotate") {
      secret = makeSecret();
      rotated = true;
      d.store.markPaired(null);
      await d.store.saveSecret(secret);
      return start();
    }
    if (s.next === "none") {
      if (s.view.kind === "paired") {
        d.store.markPaired(s.view.screenId);
        d.onPaired(secret, s.view.screenId);
      }
      return;
    }
    if (s.next === "start") return later(start, s.view.kind === "error" || s.view.kind === "offline" ? RETRY_MS : 0);
    later(poll, POLL_MS);
  }

  async function start() {
    if (stopped) return;
    let step: PairStep;
    try {
      const { data, error } = await d.rpc("pair_start", { p_secret: secret });
      step = error ? afterStartError(error.message, d.online(), rotated) : afterStart(data);
    } catch (e) {
      step = afterStartError((e as Error)?.message ?? "", d.online(), rotated);
    }
    if (step.view.kind === "waiting") rotated = false;
    await apply(step);
  }

  async function poll() {
    if (stopped) return;
    if (view.kind === "waiting" && view.expiresAt > 0 && d.now() >= view.expiresAt) return start();
    try {
      const { data, error } = await d.rpc("pair_status", { p_secret: secret });
      await apply(error ? { view, next: "poll" } : afterStatus(data, view));
    } catch {
      await apply({ view, next: "poll" });
    }
  }

  return {
    async start(existing?: string | null) {
      stopped = false;
      secret = existing ?? (await d.store.loadSecret()) ?? "";
      if (!secret) {
        secret = makeSecret();
        await d.store.saveSecret(secret);
      }
      show({ kind: "starting" });
      await start();
    },
    stop() {
      stopped = true;
      if (timer !== null) clearTimer(timer);
      timer = null;
    },
    get secret() {
      return secret;
    },
  };
}