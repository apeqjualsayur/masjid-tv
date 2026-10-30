// Countdown ring to the next waktu (Seterusnya theme, contract §9). Pure: the DisplayState's own
// times in, a fraction and a short label out. Themes draw the ring; they never do this time maths.
import type { WaktuView } from "./display-state";

/** When no waktu has passed yet today (before Imsak), the ring measures against this span. */
export const RING_FALLBACK_MS = 6 * 3_600_000;

/** "1j 49m", "49m" (rounded up, like formatCountdown); "" when unknown. */
export function formatCountdownShort(ms: number): string {
  if (!Number.isFinite(ms)) return "";
  const totalMin = Math.max(0, Math.ceil(ms / 60_000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}j ${m}m` : `${m}m`;
}

export interface CountdownRing {
  /** 1 just after the previous waktu began, 0 when the next one is due */
  remaining: number;
  /** "1j 49m" */
  label: string;
}

/**
 * Time left to `next` as a fraction of the span since the latest waktu that has begun (markers
 * included, so Syuruk → Zohor is one span). `stepMs` rounds now down first: 60 000 = a ring that
 * changes once a minute (Bottom), 1 000 = once a second (Full).
 */
export function countdownRing(s: { now: Date; waktu: WaktuView[]; next: WaktuView }, stepMs = 1000): CountdownRing {
  const now = Math.floor(s.now.getTime() / stepMs) * stepMs;
  const to = s.next.at;
  if (!Number.isFinite(to)) return { remaining: 0, label: "" };
  const begun = s.waktu.map((w) => w.at).filter((at) => Number.isFinite(at) && at <= now);
  const from = begun.length ? Math.max(...begun) : to - RING_FALLBACK_MS;
  const span = to - from;
  const remaining = span > 0 ? Math.min(1, Math.max(0, (to - now) / span)) : 0;
  return { remaining, label: formatCountdownShort(to - now) };
}
