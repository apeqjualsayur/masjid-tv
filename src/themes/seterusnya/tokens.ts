// Seterusnya tokens (_specs/01-theme-contract.md section 9). All colour comes from here.
// Mockups are 1280×720; every size used in this theme is ×1.5 (PRD round 2, D4).
// Contrast (WCAG AA, checked in seterusnya.test.tsx): every text pair ≥ 4.5:1 in every phase.
import type { PhaseKey } from "@/core";

/** Background per phase. Also the ink of the white "next" cell. */
export const BG: Record<PhaseKey, string> = { subuh: "#3A2F7A", zohor: "#0E6C8A", asar: "#9A5B10", maghrib: "#A8323F", isyak: "#101B4A" };

export const S = {
  text: "#FFFFFF",
  /**
   * Waktu cells. The contract's white tints (12 % / 24 %) left white text at 3.4–4.6:1 on zohor, asar
   * and maghrib; dark tints keep it ≥ 7.5:1 (cell) and ≥ 9.8:1 (current) in every phase.
   */
  cell: "rgba(0,0,0,0.18)",
  current: "rgba(0,0,0,0.36)",
  currentBorder: "#FFFFFF",
  next: "#FFFFFF",
  /** Ticker band, Friday strip and side column. */
  band: "rgba(0,0,0,0.25)",
  ringTrack: "rgba(255,255,255,0.2)",
  ring: "#FFFFFF",
  track: "rgba(255,255,255,0.22)",
  /** Template card */
  card: "#FFFFFF",
  cardInk: "#14202B",
  cardMuted: "#3D4A56",
  cardLabel: "#4B5865",
  cardLine: "#DCE3EA",
  solatBg: "#06080B",
  solatFg: "rgba(255,255,255,0.32)",
} as const;

export const FONT = "var(--font-manrope), sans-serif";
export const FONT_AR = "var(--font-noto-naskh-arabic), serif";
