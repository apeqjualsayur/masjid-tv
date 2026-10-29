// Ticker (contract rule 20): which announcement to show now. One item at a time, changing every 12 s,
// so it is calm and identical in lite mode. No styling here: each theme draws its own band.
import type { DisplayState } from "@/core";

export const TICKER_STEP_MS = 12_000;
/** Rule 20: label before the ticker text. */
export const TICKER_LABEL = "PENGUMUMAN";

export function tickerNow(s: Pick<DisplayState, "ticker" | "now">): string {
  const items = s.ticker.filter((x) => x.trim());
  if (!items.length) return "";
  return items[Math.floor(s.now.getTime() / TICKER_STEP_MS) % items.length];
}
