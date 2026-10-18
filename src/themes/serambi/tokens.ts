// Serambi tokens (_specs/01-theme-contract.md section 4). Fixed palette; the arch skies are
// per waktu (not per phase), so every arch always shows its own time of day.
import type { WaktuKey } from "@/core";

export const C = {
  bg: "#0B1114",
  sidebar: "#111A1D",
  emerald: "#123C30",
  emerald2: "#15332B",
  gold: "#E3B04B",
  goldOn: "#1A1405",
  white: "#FFFFFF",
  muted: "rgba(255,255,255,0.6)",
  soft: "rgba(255,255,255,0.75)",
  divider: "rgba(255,255,255,0.18)",
  goldLine: "rgba(227,176,75,0.45)",
  goldRule: "rgba(227,176,75,0.6)",
  chipDark: "rgba(5,10,12,0.55)",
} as const;

export const SKY: Record<WaktuKey, { sky: string; glow: string }> = {
  imsak: { sky: "linear-gradient(180deg,#0B1638 0%,#1F2F66 100%)", glow: "#1F2F66" },
  subuh: { sky: "linear-gradient(180deg,#1B2C5E 0%,#5C6FB0 60%,#E9A97A 100%)", glow: "#5C6FB0" },
  syuruk: { sky: "linear-gradient(180deg,#5E86C4 0%,#F4C38E 100%)", glow: "#F4C38E" },
  zohor: { sky: "linear-gradient(180deg,#2F7FC6 0%,#8CC6EE 100%)", glow: "#2F7FC6" },
  asar: { sky: "linear-gradient(180deg,#3D7DB8 0%,#E9B36A 100%)", glow: "#E9B36A" },
  maghrib: { sky: "linear-gradient(180deg,#3B2D6B 0%,#C46A7A 60%,#F2A65E 100%)", glow: "#C46A7A" },
  isyak: { sky: "linear-gradient(180deg,#050B1A 0%,#0E2A44 100%)", glow: "#0E2A44" },
};

/** Text overlay inside an arch so the label stays readable on any sky. */
export const ARCH_OVERLAY = "linear-gradient(0deg, rgba(5,10,12,.78) 0%, rgba(5,10,12,.35) 38%, transparent 62%)";
export const ARCH_OVERLAY_SMALL = "linear-gradient(0deg, rgba(5,10,12,.8) 0%, rgba(5,10,12,.3) 50%, transparent 75%)";

/** Current arch ring + glow; lite keeps the ring, drops the glow. */
export const ringCurrent = (glowPx: number, lite: boolean) =>
  lite ? `0 0 0 4px ${C.gold}` : `0 0 0 4px ${C.gold}, 0 0 ${glowPx}px rgba(227,176,75,.35)`;
export const RING_NEXT = "0 0 0 2px rgba(227,176,75,.55)";

/** Solat: near-black, tiny clock only. */
export const SOLAT_BG = "#05080A";
export const SOLAT_FG = "rgba(255,255,255,0.3)";

export const F = {
  body: "var(--font-barlow), sans-serif",
  num: "var(--font-barlow-condensed), sans-serif",
  kufi: "var(--font-reem-kufi), sans-serif",
  amiri: "var(--font-amiri), serif",
} as const;

/** Arch radius in explicit px, never 999px (contract section 4). */
export const archRadius = (w: number, bottom = 18) => `${w / 2}px ${w / 2}px ${bottom}px ${bottom}px`;