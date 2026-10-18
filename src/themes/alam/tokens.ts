// Alam tokens (_specs/01-theme-contract.md section 3). Landscape colours per phase; everything else fixed.
import type { PhaseKey } from "@/core";

export interface Scene {
  sky: string;
  sun: string;
  sx: number;
  sy: number;
  sr: number;
  glowR: number;
  stars: number;
  l1: string;
  l2: string;
  l3: string;
}

export const SCENE: Record<PhaseKey, Scene> = {
  subuh: { sky: "linear-gradient(180deg,#0E1A3D 0%,#24407E 45%,#6F7FB8 72%,#F2B27A 100%)", sun: "#FFD9A8", sx: 960, sy: 720, sr: 60, glowR: 420, stars: 0.7, l1: "#3A4F8F", l2: "#22346A", l3: "#121F45" },
  zohor: { sky: "linear-gradient(180deg,#F7CF6A 0%,#F2AE3C 45%,#E58A27 100%)", sun: "#FFF4D2", sx: 1500, sy: 230, sr: 110, glowR: 520, stars: 0, l1: "#D9822B", l2: "#B5611C", l3: "#7A3D10" },
  asar: { sky: "linear-gradient(180deg,#F6A15A 0%,#E2673A 48%,#9E3320 100%)", sun: "#FFE0B0", sx: 1380, sy: 470, sr: 95, glowR: 480, stars: 0, l1: "#9C3A1E", l2: "#6E2412", l3: "#3E1209" },
  maghrib: { sky: "linear-gradient(180deg,#2E2D6B 0%,#6C5BA8 45%,#C89BC4 75%,#F4B8A0 100%)", sun: "#FFD3B5", sx: 960, sy: 780, sr: 70, glowR: 460, stars: 0.35, l1: "#6A5AA6", l2: "#463C82", l3: "#251F52" },
  isyak: { sky: "linear-gradient(180deg,#041E26 0%,#0B3F4C 52%,#1E7A85 100%)", sun: "#E9F6F7", sx: 1520, sy: 190, sr: 44, glowR: 260, stars: 0.9, l1: "#0F5662", l2: "#0A3B45", l3: "#05232A" },
};

export const A = {
  white: "#FFFFFF",
  scrim: "linear-gradient(180deg, rgba(0,0,0,.28) 0%, transparent 30%, transparent 50%, rgba(0,0,0,.38) 100%)",
  /** Glass card (contract) and its lite replacement. */
  glass: "rgba(8,18,28,0.32)",
  glassLite: "rgba(8,18,28,0.55)",
  glassBorder: "1px solid rgba(255,255,255,0.24)",
  blur: "blur(18px)",
  /** Current card */
  current: "rgba(255,255,255,0.95)",
  currentFg: "#0F2E24",
  green: "#1F7A55",
  yellow: "#F5D33B",
  yellowFg: "#2A2400",
  ticker: "rgba(6,24,18,0.74)",
  /** Light announcement card (designs/A-Bottom) */
  card: "#F3F8F5",
  cardFg: "#0F2E24",
  cardMuted: "#4D6B5F",
  cardLine: "#D6E6DD",
  tile: "#DEECE7", // brand green 14% on white
  dots: "#C3D8CC",
  /** Iqamah / khutbah background */
  iqamahBg: "radial-gradient(circle at 50% 48%, #175A42 0%, #0B2E22 52%, #061B14 100%)",
  ringFrom: "#9BE15D",
  ringTo: "#F5D33B",
  /** Solat: near-black, tiny clock only */
  solatBg: "#030806",
  solatFg: "rgba(255,255,255,0.3)",
} as const;

/** Glass surface; lite swaps blur for the solid colour (contract section 3 + rule 6). */
export function glass(lite: boolean, bg: string = A.glass, blurPx = 18) {
  return lite
    ? { background: A.glassLite }
    : { background: bg, backdropFilter: `blur(${blurPx}px)`, WebkitBackdropFilter: `blur(${blurPx}px)` };
}

export const FONT = "var(--font-plus-jakarta-sans), sans-serif";
export const FONT_AR = "var(--font-noto-naskh-arabic), serif";

/** Palette cross-fade length when the phase changes. */
export const PHASE_FADE_MS = 60_000;