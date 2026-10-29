// Falak tokens (_specs/01-theme-contract.md section 6). All colour comes from here.
// Mockups are 1280×720; every size used in this theme is ×1.5 (PRD round 2, D4).
import type { PhaseKey } from "@/core";

export interface FalakTokens {
  bg: string;
  /** Dial face, automatic by phase (PRD D6): light = zohor, asar; dark = subuh, maghrib, isyak. */
  face: "light" | "dark";
  plate: string;
  ink: string;
  hand: string;
  sec: string;
  /** "IQAMAH ZOHOR" on the iqamah dial (darker on the light face for contrast). */
  iqLabel: string;
}

const LIGHT = { face: "light", plate: "#F7F1E3", ink: "#23252B", hand: "#1D1F24", sec: "#B3541E", iqLabel: "#8A4A12" } as const;
const DARK = { face: "dark", plate: "#12161C", ink: "#EFE7D3", hand: "#F3EBD8", sec: "#E3B25A", iqLabel: "#E3B25A" } as const;

export const TOKENS: Record<PhaseKey, FalakTokens> = {
  subuh: { bg: "#26305E", ...DARK },
  zohor: { bg: "#14566A", ...LIGHT },
  asar: { bg: "#6A4E2A", ...LIGHT },
  maghrib: { bg: "#7A2F3A", ...DARK },
  isyak: { bg: "#0E1428", ...DARK },
};

/** Fixed tokens (contract section 6). */
export const F = {
  text: "#F7F1E3",
  gold: "#E9BD63",
  rim: "rgba(255,255,255,0.16)",
  pill: "#F7F1E3",
  pillInk: "#1B1D22",
  rule: "rgba(247,241,227,0.16)",
  panel: "rgba(0,0,0,0.26)",
  /** Template card */
  card: "#F7F1E3",
  cardInk: "#1B1D22",
  cardBody: "#3A3D45",
  cardMuted: "#4B4E57",
  cardLine: "#D9D1BD",
  /** Text accent on the light card (gold is too pale on cream). */
  cardAccent: "#8A4A12",
  /** Solat: near-black, tiny clock only (PRD section 5). */
  solatBg: "#06080B",
  solatFg: "rgba(255,255,255,0.32)",
} as const;

/** Imsak / Syuruk rows (markers) when not current. */
export const MARKER_OPACITY = 0.74;

export const FONT = "var(--font-manrope), sans-serif";
export const SERIF = "var(--font-fraunces), serif";
export const FONT_AR = "var(--font-noto-naskh-arabic), serif";
