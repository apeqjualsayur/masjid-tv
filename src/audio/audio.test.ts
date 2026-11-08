// Player and synth with a fake AudioContext (Vitest runs in node: no Web Audio).
import { describe, expect, it, vi } from "vitest";
import { FADE_S, HAYYA_MAX_S, HAYYA_URL, createPlayer, volumeGain, type PlayerDeps } from "./player";
import { ALARM_MAX_S, BEEP_MAX_S, CHIME_MAX_S, alarmNotes, beepNotes, chimeNotes, lengthOf, renderNotes } from "./synth";

/** Records what was scheduled; enough of the Web Audio API for the player and synth. */
class FakeParam {
  value = 1;
  events: [string, number, number][] = [];
  setValueAtTime(v: number, t: number) { this.events.push(["set", v, t]); }
  linearRampToValueAtTime(v: number, t: number) { this.events.push(["linear", v, t]); }
  exponentialRampToValueAtTime(v: number, t: number) { this.events.push(["exp", v, t]); }
  cancelScheduledValues() {}
}
class FakeNode {
  connected = true;
  connect() {}
  disconnect() { this.connected = false; }
}
class FakeGain extends FakeNode {
  gain = new FakeParam();
}
class FakeSource extends FakeNode {
  started: number | null = null;
  stoppedAt: number | null = null;
  stopped = false;
  constructor(readonly ctx: FakeCtx) { super(); }
  start(t = 0) { this.started = t; this.ctx.playing.add(this); }
  stop(t?: number) {
    if (t === undefined) { this.stopped = true; this.ctx.playing.delete(this); }
    else this.stoppedAt = t;
  }
}
class FakeOsc extends FakeSource {
  type = "sine";
  frequency = new FakeParam();
}
class FakeBufferSource extends FakeSource {
  buffer: { duration: number } | null = null;
}
class FakeCtx {
  state: "suspended" | "running" = "suspended";
  currentTime = 0;
  destination = new FakeNode();
  onstatechange: (() => void) | null = null;
  playing = new Set<FakeSource>();
  gains: FakeGain[] = [];
  bufferSources: FakeBufferSource[] = [];
  decodeFails = false;
  bufferDuration = 17.4;
  resumeFails = false;
  resume() {
    if (this.resumeFails) return Promise.reject(new Error("NotAllowedError"));
    this.state = "running";
    this.onstatechange?.();
    return Promise.resolve();
  }
  createGain() { const g = new FakeGain(); this.gains.push(g); return g; }
  createOscillator() { return new FakeOsc(this); }
  createBufferSource() { const s = new FakeBufferSource(this); this.bufferSources.push(s); return s; }
  decodeAudioData() { return this.decodeFails ? Promise.reject(new Error("EncodingError")) : Promise.resolve({ duration: this.bufferDuration }); }
}

function setup(o: { ctx?: FakeCtx | null; fetchOk?: boolean; fetchThrows?: boolean } = {}) {
  const ctx = o.ctx === undefined ? new FakeCtx() : o.ctx;
  const fetch = vi.fn(async (_url: string) => {
    if (o.fetchThrows) throw new TypeError("Failed to fetch");
    return { ok: o.fetchOk ?? true, status: o.fetchOk === false ? 404 : 200, arrayBuffer: async () => new ArrayBuffer(8) } as Response;
  });
  const warn = vi.fn();
  const deps: PlayerDeps = { createContext: () => ctx as unknown as AudioContext, fetch, warn };
  return { ctx, fetch, warn, p: createPlayer(deps) };
}
const flush = () => new Promise((r) => setTimeout(r, 0));

describe("synth note lists (D7 caps)", () => {
  it("beep: 3 short beeps at 880 Hz", () => {
    const n = beepNotes();
    expect(n).toHaveLength(3);
    expect(n.every((x) => x.freq === 880 && x.dur <= 0.2)).toBe(true);
    expect(lengthOf(n)).toBeLessThanOrEqual(BEEP_MAX_S);
  });

  it("chime: two notes, soft attack, about 3 s", () => {
    const n = chimeNotes();
    expect(new Set(n.map((x) => x.start)).size).toBe(2);
    expect(n.every((x) => x.attack >= 0.02 && x.shape === "decay")).toBe(true);
    expect(lengthOf(n)).toBeGreaterThan(2.5);
    expect(lengthOf(n)).toBeLessThanOrEqual(CHIME_MAX_S);
  });

  it("alarm: two alternating tones, never longer than 10 s", () => {
    const n = alarmNotes();
    expect(new Set(n.map((x) => x.freq)).size).toBe(2);
    expect(n[0].freq).not.toBe(n[1].freq);
    expect(lengthOf(n)).toBeLessThanOrEqual(ALARM_MAX_S);
    expect(lengthOf(alarmNotes(60))).toBeLessThanOrEqual(ALARM_MAX_S);
  });

  it("renderNotes schedules every note and its stop function silences them", () => {
    const ctx = new FakeCtx();
    const stop = renderNotes(ctx as unknown as AudioContext, ctx.destination as unknown as AudioNode, beepNotes());
    expect(ctx.playing.size).toBe(3);
    stop();
    expect(ctx.playing.size).toBe(0);
    expect(() => stop()).not.toThrow();
  });
});

describe("volume", () => {
  it("gentle curve: (v/100)², clamped", () => {
    expect(volumeGain(0)).toBe(0);
    expect(volumeGain(100)).toBe(1);
    expect(volumeGain(50)).toBeCloseTo(0.25);
    expect(volumeGain(70)).toBeCloseTo(0.49);
    expect(volumeGain(150)).toBe(1);
    expect(volumeGain(-5)).toBe(0);
  });

  it("setVolume sets the master gain", () => {
    const { ctx, p } = setup();
    p.prime();
    const master = ctx!.gains[0];
    expect(master.gain.value).toBeCloseTo(0.49); // default 70
    p.setVolume(30);
    expect(master.gain.value).toBeCloseTo(0.09);
    p.setVolume(Number.NaN);
    expect(master.gain.value).toBeCloseTo(0.09);
  });

  it("a volume set before the context exists applies when it is created", () => {
    const { ctx, p } = setup();
    p.setVolume(100);
    p.prime();
    expect(ctx!.gains[0].gain.value).toBe(1);
  });
});

describe("unlock", () => {
  it("resolves once audio runs, so a preview can play right after (admin Cuba)", async () => {
    const { ctx, p } = setup();
    await p.unlock();
    expect(p.isLocked()).toBe(false);
    await p.play("beep");
    expect(ctx!.playing.size).toBe(3);
  });

  it("locked until unlock(); listeners hear the change", async () => {
    const { p } = setup();
    const heard = vi.fn();
    p.subscribe(heard);
    expect(p.isLocked()).toBe(true);
    p.prime();
    expect(p.isLocked()).toBe(true);
    p.unlock();
    await flush();
    expect(p.isLocked()).toBe(false);
    expect(heard).toHaveBeenCalled();
  });

  it("a refused resume stays locked and never throws", async () => {
    const ctx = new FakeCtx();
    ctx.resumeFails = true;
    const { p } = setup({ ctx });
    await expect(p.unlock()).resolves.toBeUndefined();
    expect(p.isLocked()).toBe(true);
  });

  it("no Web Audio: not 'locked' (nothing to unlock, no icon), and everything is a no-op", async () => {
    const { p } = setup({ ctx: null });
    p.prime(); // the TV primes as soon as sound is on
    expect(p.isLocked()).toBe(false);
    await expect(p.unlock()).resolves.toBeUndefined();
    await expect(p.play("chime")).resolves.toBeUndefined();
    await expect(p.play("hayya")).resolves.toBeUndefined();
  });

  it("a context that throws on creation counts as no Web Audio", async () => {
    const p = createPlayer({ createContext: () => { throw new Error("blocked"); }, fetch: vi.fn(), warn: vi.fn() });
    expect(() => p.prime()).not.toThrow();
    await expect(p.play("beep")).resolves.toBeUndefined();
  });
});

describe("play", () => {
  it("does nothing while locked", async () => {
    const { ctx, p } = setup();
    await p.play("beep");
    expect(ctx!.playing.size).toBe(0);
  });

  it("plays once unlocked; 'off' plays nothing", async () => {
    const { ctx, p } = setup();
    p.unlock();
    await flush();
    await p.play("off");
    expect(ctx!.playing.size).toBe(0);
    await p.play("beep");
    expect(ctx!.playing.size).toBe(3);
  });

  it("one sound at a time: a new play() stops the previous one", async () => {
    const { ctx, p } = setup();
    p.unlock();
    await flush();
    await p.play("alarm");
    const alarmCount = ctx!.playing.size;
    expect(alarmCount).toBeGreaterThan(10);
    await p.play("beep");
    expect(ctx!.playing.size).toBe(3);
    await p.play("hayya");
    expect([...ctx!.playing].every((s) => s instanceof FakeBufferSource)).toBe(true);
    expect(ctx!.playing.size).toBe(1);
    p.stop();
    expect(ctx!.playing.size).toBe(0);
  });

  it("a play() started while the recording loads wins over it", async () => {
    const { ctx, p } = setup();
    p.unlock();
    await flush();
    const first = p.play("hayya"); // waits for fetch + decode
    await p.play("beep");
    await first;
    expect(ctx!.playing.size).toBe(3);
    expect(ctx!.bufferSources).toHaveLength(0);
  });

  it("never throws, even when the context misbehaves", async () => {
    const { ctx, p } = setup();
    p.unlock();
    await flush();
    ctx!.createOscillator = () => { throw new Error("boom"); };
    ctx!.createBufferSource = () => { throw new Error("boom"); };
    await expect(p.play("chime")).resolves.toBeUndefined();
    await expect(p.play("hayya")).resolves.toBeUndefined();
    expect(() => p.stop()).not.toThrow();
    expect(() => p.setVolume(50)).not.toThrow();
  });
});

describe("hayya recording", () => {
  it("fetched and decoded once, kept in memory, played whole (17.4 s: no cut)", async () => {
    const { ctx, fetch, p } = setup();
    p.unlock();
    await flush();
    await p.play("hayya");
    await p.play("hayya");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(HAYYA_URL);
    const src = ctx!.bufferSources.at(-1)!;
    expect(src.started).not.toBeNull();
    expect(src.stoppedAt).toBeNull(); // plays to the end
  });

  it("a longer (wrong) file is cut at 20 s with a 0.5 s fade", async () => {
    const ctx = new FakeCtx();
    ctx.bufferDuration = 45;
    const { p } = setup({ ctx });
    p.unlock();
    await flush();
    await p.play("hayya");
    const src = ctx.bufferSources[0];
    expect(src.stoppedAt).toBeCloseTo(src.started! + HAYYA_MAX_S);
    const fade = ctx.gains.at(-1)!.gain.events;
    expect(fade).toContainEqual(["linear", 0, src.started! + HAYYA_MAX_S]);
    expect(fade).toContainEqual(["set", 1, src.started! + HAYYA_MAX_S - FADE_S]);
  });

  it.each([
    ["file missing (404)", { fetchOk: false }],
    ["network error", { fetchThrows: true }],
  ])("%s: the chime plays instead, and console.warn fires once", async (_name, o) => {
    const { ctx, warn, p } = setup(o);
    p.unlock();
    await flush();
    await p.play("hayya");
    expect(ctx!.playing.size).toBe(chimeNotes().length);
    expect([...ctx!.playing].every((s) => s instanceof FakeOsc)).toBe(true);
    await p.play("hayya");
    await p.play("hayya");
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("decode error: the chime instead, one warning", async () => {
    const ctx = new FakeCtx();
    ctx.decodeFails = true;
    const { warn, p } = setup({ ctx });
    p.unlock();
    await flush();
    await p.play("hayya");
    await p.play("hayya");
    expect(ctx.playing.size).toBe(chimeNotes().length);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("preloadHayya fetches ahead of the first cue, without playing", async () => {
    const { ctx, fetch, p } = setup();
    await p.preloadHayya();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(ctx!.playing.size).toBe(0);
  });
});
