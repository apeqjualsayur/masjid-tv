// Synthesised cues (_specs/50-PRD-sound.md D3, D7): no audio files, so they work offline. Each sound
// is a list of notes (plain data, tested against the length caps), rendered with oscillators.
//   beep  — 3 short beeps at 880 Hz (≈ 0.9 s)
//   chime — soft two-note "ding-dong", gentle attack, long decay (≈ 3 s)
//   alarm — two alternating tones, stops at 8 s (cap 10 s)

export interface Note {
  /** Hz */
  freq: number;
  /** Seconds after the sound starts. */
  start: number;
  /** Seconds from start to silence. */
  dur: number;
  type: OscillatorType;
  /** Peak gain 0..1 before the master volume. */
  peak: number;
  /** Seconds to reach the peak. */
  attack: number;
  /** "hold": flat until a short release; "decay": exponential fall to silence over the whole note. */
  shape: "hold" | "decay";
}

export const BEEP_MAX_S = 1.2;
export const CHIME_MAX_S = 3.5;
export const ALARM_MAX_S = 10;

export function beepNotes(): Note[] {
  return [0, 0.33, 0.66].map((start) => ({ freq: 880, start, dur: 0.18, type: "sine", peak: 0.6, attack: 0.01, shape: "hold" }));
}

export function chimeNotes(): Note[] {
  // E5 then C5, each with a quiet octave partial for a bell-like colour.
  const bell = (freq: number, start: number, dur: number): Note[] => [
    { freq, start, dur, type: "sine", peak: 0.5, attack: 0.03, shape: "decay" },
    { freq: freq * 2, start, dur: dur * 0.6, type: "sine", peak: 0.12, attack: 0.03, shape: "decay" },
  ];
  return [...bell(659.25, 0, 2.2), ...bell(523.25, 0.7, 2.3)];
}

export function alarmNotes(totalS = 8): Note[] {
  const step = 0.25;
  const n = Math.floor(Math.min(totalS, ALARM_MAX_S) / step);
  return Array.from({ length: n }, (_, i) => ({ freq: i % 2 === 0 ? 880 : 660, start: i * step, dur: step * 0.9, type: "triangle" as const, peak: 0.45, attack: 0.01, shape: "hold" as const }));
}

/** When the last note ends, in seconds. */
export const lengthOf = (notes: Note[]) => notes.reduce((m, n) => Math.max(m, n.start + n.dur), 0);

/**
 * Schedules the notes on `ctx` into `dest` (the master gain) and returns a stop function that
 * silences them at once. Never throws: a failing node is skipped.
 */
export function renderNotes(ctx: BaseAudioContext, dest: AudioNode, notes: Note[]): () => void {
  const t0 = ctx.currentTime + 0.02;
  const oscs: { osc: OscillatorNode; gain: GainNode }[] = [];
  for (const n of notes) {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = n.type;
      osc.frequency.setValueAtTime(n.freq, t0 + n.start);
      const g = gain.gain;
      const start = t0 + n.start;
      const end = start + n.dur;
      g.setValueAtTime(0, start);
      g.linearRampToValueAtTime(n.peak, start + n.attack);
      if (n.shape === "decay") g.exponentialRampToValueAtTime(0.0001, end);
      else {
        g.setValueAtTime(n.peak, Math.max(start + n.attack, end - 0.02));
        g.linearRampToValueAtTime(0, end);
      }
      osc.connect(gain);
      gain.connect(dest);
      osc.start(start);
      osc.stop(end + 0.05);
      oscs.push({ osc, gain });
    } catch {
      // skip this note
    }
  }
  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    for (const { osc, gain } of oscs) {
      try {
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        osc.stop();
        osc.disconnect();
        gain.disconnect();
      } catch {
        // already stopped
      }
    }
  };
}

export const beep = (ctx: BaseAudioContext, dest: AudioNode) => renderNotes(ctx, dest, beepNotes());
export const chime = (ctx: BaseAudioContext, dest: AudioNode) => renderNotes(ctx, dest, chimeNotes());
export const alarm = (ctx: BaseAudioContext, dest: AudioNode) => renderNotes(ctx, dest, alarmNotes());
