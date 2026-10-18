// Burn-in protection (PRD section 11): move the whole stage a few px every 10 minutes.
export const BURN_IN_PERIOD_MS = 10 * 60_000;

/**
 * Offset for a 10-minute slot: each axis in -2..+2 px, so the stage travels over a 4 px range
 * and never loses more than 2 px at any edge. Consecutive slots always differ on x.
 */
export function burnInOffset(realMs: number): { x: number; y: number } {
  const slot = Math.floor(realMs / BURN_IN_PERIOD_MS);
  const x = ((slot * 2) % 5) - 2;
  const y = ((Math.floor(slot / 5) * 3 + slot) % 5) - 2;
  return { x, y };
}