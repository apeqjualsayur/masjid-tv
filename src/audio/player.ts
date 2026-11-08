// TV sound playback (_specs/50-PRD-sound.md D3, D6, D7). One lazy AudioContext; browsers start it
// locked ("suspended") until a key press, click or tap calls unlock(). Every public function is
// wrapped: a locked, missing or failing sound never throws and never blocks anything.
//   hayya — the owner's recording, fetched and decoded once, kept in memory; played whole (cut at
//           20 s with a 0.5 s fade only if a wrong, longer file is supplied). If it cannot be fetched or
//           decoded: the chime instead, with one console.warn.
// A new play() stops the sound still playing.
import type { SoundKind } from "@/core";
import { alarm, beep, chime } from "./synth";

export const HAYYA_URL = "/sounds/hayya-ala-solah.mp3";
export const HAYYA_MAX_S = 20;
export const FADE_S = 0.5;

/** Volume 0–100 → gain, on a gentle curve (quiet settings stay usable): (v/100)². */
export function volumeGain(volume: number): number {
  const v = Number.isFinite(volume) ? Math.min(100, Math.max(0, volume)) : 70;
  return (v / 100) ** 2;
}

export interface PlayerDeps {
  /** null when the browser has no Web Audio. */
  createContext: () => AudioContext | null;
  fetch: (url: string) => Promise<Response>;
  warn: (...args: unknown[]) => void;
}

export interface Player {
  /** Create the context early (still locked), so isLocked() is known before the first cue. */
  prime(): void;
  /** Call from a key press / click / tap: resumes the context. Resolves once it runs (or failed); never rejects. */
  unlock(): Promise<void>;
  /** True until the context runs. False when the browser has no Web Audio (nothing to unlock). */
  isLocked(): boolean;
  subscribe(listener: () => void): () => void;
  setVolume(volume: number): void;
  play(sound: SoundKind): Promise<void>;
  stop(): void;
  /** Fetch + decode the recording ahead of the first cue. */
  preloadHayya(): Promise<void>;
}

export function createPlayer(deps: PlayerDeps): Player {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let unsupported = false;
  let volume = 70;
  let stopCurrent: (() => void) | null = null;
  let playId = 0;
  let hayya: Promise<AudioBuffer | null> | null = null;
  const listeners = new Set<() => void>();

  const notify = () => {
    for (const l of listeners) {
      try {
        l();
      } catch {
        // a listener's problem
      }
    }
  };

  const ensure = (): AudioContext | null => {
    if (ctx || unsupported) return ctx;
    try {
      const c = deps.createContext();
      if (!c) {
        unsupported = true;
        return null;
      }
      const g = c.createGain();
      g.gain.value = volumeGain(volume);
      g.connect(c.destination);
      c.onstatechange = notify;
      ctx = c;
      master = g;
    } catch {
      unsupported = true;
      ctx = null;
    }
    return ctx;
  };

  const stopNow = () => {
    const s = stopCurrent;
    stopCurrent = null;
    try {
      s?.();
    } catch {
      // already stopped
    }
  };

  const loadHayya = (): Promise<AudioBuffer | null> => {
    if (hayya) return hayya;
    hayya = (async () => {
      const c = ensure();
      if (!c) return null;
      const res = await deps.fetch(HAYYA_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await c.decodeAudioData(await res.arrayBuffer());
    })().catch((e) => {
      deps.warn(`[masjid-tv/audio] ${HAYYA_URL} unavailable (${String((e as Error)?.message ?? e)}); playing the chime instead.`);
      return null;
    });
    return hayya;
  };

  const playBuffer = (c: AudioContext, dest: AudioNode, buf: AudioBuffer): (() => void) => {
    const src = c.createBufferSource();
    const gain = c.createGain();
    src.buffer = buf;
    src.connect(gain);
    gain.connect(dest);
    const t0 = c.currentTime + 0.02;
    src.start(t0);
    if (buf.duration > HAYYA_MAX_S) {
      gain.gain.setValueAtTime(1, t0 + HAYYA_MAX_S - FADE_S);
      gain.gain.linearRampToValueAtTime(0, t0 + HAYYA_MAX_S);
      src.stop(t0 + HAYYA_MAX_S);
    }
    return () => {
      try {
        src.stop();
        src.disconnect();
        gain.disconnect();
      } catch {
        // already ended
      }
    };
  };

  return {
    prime() {
      ensure();
    },
    async unlock() {
      try {
        const c = ensure();
        if (!c || c.state === "running") return;
        // resume() is called synchronously inside the gesture; awaiting it afterwards is fine.
        await c.resume().then(notify, () => undefined);
      } catch {
        // stays locked
      }
    },
    isLocked() {
      return !unsupported && (!ctx || ctx.state !== "running");
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setVolume(v) {
      try {
        volume = Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : volume;
        if (master) master.gain.value = volumeGain(volume);
      } catch {
        // keeps the old volume
      }
    },
    async play(sound) {
      try {
        if (sound === "off") return;
        const c = ensure();
        if (!c || !master || c.state !== "running") return; // locked or no Web Audio: quietly nothing
        stopNow();
        const id = ++playId;
        const dest = master;
        if (sound === "hayya") {
          const buf = await loadHayya();
          if (id !== playId) return; // a newer play() started meanwhile
          stopCurrent = buf ? playBuffer(c, dest, buf) : chime(c, dest);
        } else {
          stopCurrent = (sound === "beep" ? beep : sound === "alarm" ? alarm : chime)(c, dest);
        }
      } catch {
        // never throws
      }
    },
    stop() {
      playId++;
      stopNow();
    },
    async preloadHayya() {
      try {
        await loadHayya();
      } catch {
        // loadHayya already falls back
      }
    },
  };
}

type AudioContextCtor = new () => AudioContext;

/** The TV's player (browser globals). */
export const player: Player = createPlayer({
  createContext: () => {
    if (typeof window === "undefined") return null;
    const w = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
    const Ctor = w.AudioContext ?? w.webkitAudioContext;
    return Ctor ? new Ctor() : null;
  },
  fetch: (url) => fetch(url),
  warn: (...args) => console.warn(...args),
});
