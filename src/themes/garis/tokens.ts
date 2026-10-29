// Garis Masa tokens (_specs/01-theme-contract.md section 7). All colour comes from here.
// Mockups are 1280×720; every size used in this theme is ×1.5 (PRD round 2, D4).
import type { PhaseKey, WaktuKey } from "@/core";

/** Background per phase. */
export const BG: Record<PhaseKey, string> = { subuh: "#141A33", zohor: "#0F2230", asar: "#241C10", maghrib: "#2A1419", isyak: "#0A0F1F" };

/** Segment colour per waktu (fixed). `syuruk` is the neutral Syuruk–Zohor segment. */
export const SEG: Record<WaktuKey, string> = {
  imsak: "#7A84AE",
  subuh: "#B8A9F0",
  syuruk: "#2D3A4A",
  zohor: "#8CCBF2",
  asar: "#EDC27F",
  maghrib: "#F09A8C",
  isyak: "#8FA5F0",
};
/** Accent = the current prayer's segment colour, i.e. the phase's. */
export const accentOf = (phase: PhaseKey) => SEG[phase];

/** Segment opacity (contract §7): past 0.42, current 1, upcoming 0.72. */
export const OPACITY = { past: 0.42, current: 1, upcoming: 0.72 } as const;

export const G = {
  text: "#F4F1EA",
  segInk: "#10151F",
  neutralInk: "#A9B6C4",
  now: "#FFFFFF",
  nowInk: "#10151F",
  labelRule: "rgba(255,255,255,0.3)",
  panel: "rgba(255,255,255,0.05)",
  band: "rgba(0,0,0,0.28)",
  track: "rgba(255,255,255,0.14)",
  /** Template card */
  card: "#F4F1EA",
  cardInk: "#10151F",
  cardBody: "#3A3D45",
  cardMuted: "#4B4E57",
  cardLine: "#DCD6C8",
  /** Text accent on the light card (the pastel segment colours are too pale on cream). */
  cardAccent: "#1F4E6B",
  /** Label on the dark highlight box. */
  boxLabel: "#EDC27F",
  solatBg: "#06080B",
  solatFg: "rgba(255,255,255,0.32)",
} as const;

export const FONT = "var(--font-manrope), sans-serif";
export const SERIF = "var(--font-fraunces), serif";
export const FONT_AR = "var(--font-noto-naskh-arabic), serif";
