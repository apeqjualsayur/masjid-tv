// Detects a slow device for automatic lite mode (PRD section 11): average frame time > 50 ms over 10 s.
export const SLOW_FRAME_MS = 50;
export const SAMPLE_WINDOW_MS = 10_000;
/** A gap this long means the page was hidden or paused, not slow: restart the window. */
const PAUSE_GAP_MS = 1_000;

export type FrameVerdict = "slow" | "ok" | null;

/** Feed it requestAnimationFrame timestamps; it returns a verdict once per full window. */
export function createFrameMonitor() {
  let start: number | null = null;
  let last = 0;
  let frames = 0;
  return {
    push(t: number): FrameVerdict {
      if (start === null || t - last > PAUSE_GAP_MS) {
        start = t;
        last = t;
        frames = 0;
        return null;
      }
      last = t;
      frames++;
      const elapsed = t - start;
      if (elapsed < SAMPLE_WINDOW_MS) return null;
      const verdict = elapsed / frames > SLOW_FRAME_MS ? "slow" : "ok";
      start = t;
      frames = 0;
      return verdict;
    },
  };
}