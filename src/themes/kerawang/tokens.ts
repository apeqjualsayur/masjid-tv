// Kerawang tokens (_specs/01-theme-contract.md section 8). All colour comes from here.
// Mockups are 1280×720; every size used in this theme is ×1.5 (PRD round 2, D4).
// Contrast (WCAG AA, checked in kerawang.test.tsx): text ≥ 4.5:1 on every phase background, plaque and band.
import type { PhaseKey } from "@/core";

/** Background per phase (the timber wall). */
export const BG: Record<PhaseKey, string> = { subuh: "#3F3552", zohor: "#5E3D24", asar: "#6C4626", maghrib: "#5C2B27", isyak: "#241A28" };

/** Timber grain over the background: one cheap CSS gradient, dropped in lite. */
export const GRAIN = "repeating-linear-gradient(90deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 3px, transparent 3px, transparent 12px)";

/** Panel opacity: past waktu dim (contract floor 0.42; 0.6 keeps the plaque text above 5:1), Imsak/Syuruk 0.82. */
export const OPACITY = { past: 0.6, marker: 0.82, normal: 1 } as const;

export const K = {
  text: "#F6EBD4",
  gold: "#F2C45A",
  timber: "#2E1B0F",
  /** Unlit plaque and its border; the carving relief colour on an unlit panel. */
  plaque: "#3A2414",
  border: "#8A6428",
  carving: "#4E3120",
  /** "awan" border motif. */
  awan: "#D4A94E",
  /** Current panel glow (none in lite). */
  glow: "0 0 105px 9px rgba(242,196,90,0.55)",
  /**
   * Friday strip, ticker and side column: timber at 60 %. Gold text on the plain 15 % gold tint failed
   * AA on zohor (4.3:1) and asar (3.8:1); on this fill it is ≥ 7.8:1 in every phase.
   */
  band: "rgba(46,27,15,0.6)",
  /** Top edge of the iqamah light. */
  lightEdge: "#FFE9A8",
  track: "rgba(246,235,212,0.16)",
  /** Template card */
  card: "#F6EBD4",
  cardInk: "#2E1B0F",
  cardMuted: "#4A3322",
  cardLabel: "#6A4F36",
  cardLine: "#C9B58A",
  /** Kematian: plain dark panel, no pattern, no gold (rule 7, PRD §5). */
  soberText: "#F6EBD4",
  soberMuted: "#CDBB9C",
  soberLine: "#5A4330",
  solatBg: "#0B0705",
  solatFg: "rgba(246,235,212,0.32)",
} as const;

/** Sizes of the carving tiles and the awan band (×1.5 of the mockup's 48 and 60×26). */
export const TILE = 72;
export const AWAN = { w: 90, h: 39 } as const;

export const FONT = "var(--font-manrope), sans-serif";
export const SERIF = "var(--font-fraunces), serif";
export const FONT_AR = "var(--font-noto-naskh-arabic), serif";
