import { describe, expect, it } from "vitest";
import type { DeviceStore } from "./device";
import type { PairView } from "./logic";
import { createPairingRunner, type Rpc } from "./runner";

function harness(answers: Record<string, (secret: string) => { data?: unknown; error?: { message: string } | null }>, opts: { secret?: string | null; online?: boolean } = {}) {
  let t = Date.parse("2026-10-22T10:00:00Z");
  const timers: { fn: () => void; at: number }[] = [];
  const calls: string[] = [];
  const views: PairView[] = [];
  const saved: string[] = [];
  let pairedMark: string | null = "x";
  const paired: { secret: string; id: string | null }[] = [];
  let n = 0;
  const store: DeviceStore = {
    loadSecret: async () => opts.secret ?? null,
    saveSecret: async (s) => void saved.push(s),
    pairedScreen: () => pairedMark,
    markPaired: (id) => void (pairedMark = id),
  };
  const rpc: Rpc = async (fn, args) => {
    calls.push(`${fn}:${args.p_secret.slice(0, 4)}`);
    const a = answers[fn](args.p_secret);
    return { data: a.data ?? null, error: a.error ?? null };
  };
  const runner = createPairingRunner({
    rpc, store, now: () => t, online: () => opts.online ?? true,
    onView: (v) => void views.push(v),
    onPaired: (secret, id) => void paired.push({ secret, id }),
    setTimer: (fn, ms) => {
      const x = { fn, at: t + ms };
      timers.push(x);
      return x;
    },
    clearTimer: (x) => {
      const i = timers.indexOf(x as (typeof timers)[number]);
      if (i >= 0) timers.splice(i, 1);
    },
    makeSecret: () => `${String(++n).repeat(4)}${"0".repeat(60)}`,
  });
  /** Advance the clock, running due timers in order. */
  async function advance(ms: number) {
    const end = t + ms;
    for (;;) {
      timers.sort((a, b) => a.at - b.at);
      const next = timers[0];
      if (!next || next.at > end) break;
      timers.shift();
      t = next.at;
      next.fn();
      await new Promise((r) => setTimeout(r, 0));
      await new Promise((r) => setTimeout(r, 0));
    }
    t = end;
  }
  return { runner, calls, views, saved, paired, advance, mark: () => pairedMark, setTime: (x: number) => (t = x), time: () => t };
}

const exp = (min: number) => new Date(Date.parse("2026-10-22T10:00:00Z") + min * 60_000).toISOString();

describe("pairing runner", () => {
  it("first run: new secret saved, code shown, pair_status every 5 s until paired", async () => {
    let polls = 0;
    const h = harness({
      pair_start: () => ({ data: { status: "waiting", code: "482913", expires_at: exp(10) } }),
      pair_status: () => (++polls < 3 ? { data: { status: "waiting", code: "482913" } } : { data: { status: "paired", screen_id: "scr-1" } }),
    });
    await h.runner.start();
    expect(h.saved).toEqual(["1111" + "0".repeat(60)]);
    expect(h.views.at(-1)).toMatchObject({ kind: "waiting", code: "482913" });
    await h.advance(4_999);
    expect(h.calls).toEqual(["pair_start:1111"]);
    await h.advance(15_001);
    expect(h.calls).toEqual(["pair_start:1111", "pair_status:1111", "pair_status:1111", "pair_status:1111"]);
    expect(h.views.at(-1)).toEqual({ kind: "paired", screenId: "scr-1" });
    expect(h.paired).toEqual([{ secret: "1111" + "0".repeat(60), id: "scr-1" }]);
    expect(h.mark()).toBe("scr-1");
    await h.advance(60_000);
    expect(h.calls).toHaveLength(4);
  });

  it("uses the saved secret and fetches a new code when the old one expires", async () => {
    let starts = 0;
    const h = harness(
      {
        pair_start: () => ({ data: { status: "waiting", code: ++starts === 1 ? "111111" : "222222", expires_at: exp(starts === 1 ? 1 : 11) } }),
        pair_status: () => ({ data: { status: "waiting", code: starts === 1 ? "111111" : "222222" } }),
      },
      { secret: "ab".repeat(32) },
    );
    await h.runner.start();
    expect(h.saved).toEqual([]);
    await h.advance(65_000);
    expect(h.calls.filter((c) => c.startsWith("pair_start"))).toEqual(["pair_start:abab", "pair_start:abab"]);
    expect(h.views.at(-1)).toMatchObject({ kind: "waiting", code: "222222" });
  });

  it("'busy' for a secret whose screen was deleted: rotates to a new secret once", async () => {
    const h = harness(
      {
        pair_start: (s) => (s.startsWith("abab") ? { error: { message: "busy" } } : { data: { status: "waiting", code: "333333", expires_at: exp(10) } }),
        pair_status: () => ({ data: { status: "waiting", code: "333333" } }),
      },
      { secret: "ab".repeat(32) },
    );
    await h.runner.start();
    expect(h.calls).toEqual(["pair_start:abab", "pair_start:1111"]);
    expect(h.saved).toEqual(["1111" + "0".repeat(60)]);
    expect(h.mark()).toBeNull();
    expect(h.views.at(-1)).toMatchObject({ kind: "waiting", code: "333333" });
  });

  it("offline: shows offline and retries every 10 s", async () => {
    const h = harness({ pair_start: () => ({ error: { message: "Failed to fetch" } }), pair_status: () => ({}) }, { online: false });
    await h.runner.start();
    expect(h.views.at(-1)).toEqual({ kind: "offline" });
    await h.advance(30_000);
    expect(h.calls).toHaveLength(4);
  });

  it("already paired (saved secret): goes straight to paired", async () => {
    const h = harness({ pair_start: () => ({ data: { status: "already_paired" } }), pair_status: () => ({}) }, { secret: "cd".repeat(32) });
    await h.runner.start();
    expect(h.views.at(-1)).toEqual({ kind: "paired", screenId: null });
    expect(h.paired).toHaveLength(1);
  });

  it("stop() cancels further calls", async () => {
    const h = harness({ pair_start: () => ({ data: { status: "waiting", code: "482913", expires_at: exp(10) } }), pair_status: () => ({ data: { status: "waiting", code: "482913" } }) });
    await h.runner.start();
    h.runner.stop();
    await h.advance(60_000);
    expect(h.calls).toEqual(["pair_start:1111"]);
  });
});