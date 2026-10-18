// Tenang tokens (_specs/01-theme-contract.md section 5). All colour comes from here.
import type { PhaseKey } from "@/core";

export interface TenangTokens {
  bg: string;
  fg: string;
  muted: string;
  accent: string;
  pill: string;
  card: string;
  rule: string;
}

export const TOKENS: Record<PhaseKey, TenangTokens> = {
  subuh: { bg: "#E8EAF6", fg: "#1F2440", muted: "#5F6585", accent: "#4F58AE", pill: "#FFFFFF", card: "#FFFFFF", rule: "rgba(31,36,64,.12)" },
  zohor: { bg: "#EAF3F8", fg: "#14303D", muted: "#56707E", accent: "#23709A", pill: "#FFFFFF", card: "#FFFFFF", rule: "rgba(20,48,61,.12)" },
  asar: { bg: "#F8EFE6", fg: "#3B2A1E", muted: "#7E6853", accent: "#A9612A", pill: "#FFFFFF", card: "#FFFFFF", rule: "rgba(59,42,30,.12)" },
  maghrib: { bg: "#F6E9EC", fg: "#3A2230", muted: "#80616E", accent: "#9C3F5E", pill: "#FFFFFF", card: "#FFFFFF", rule: "rgba(58,34,48,.12)" },
  isyak: { bg: "#131A2B", fg: "#E9ECF5", muted: "#8F98B3", accent: "#9DB0EE", pill: "rgba(255,255,255,.09)", card: "#1B2338", rule: "rgba(255,255,255,.10)" },
};

/** Fixed values listed in the contract (not phase colours). Dropped in lite mode. */
export const SHADOW_PILL = "0 18px 40px rgba(20,30,50,.10)";
export const SHADOW_CARD = "0 30px 70px rgba(20,30,50,.08)";
/** Solat screen: near-black, tiny clock only (PRD section 5). */
export const SOLAT_BG = "#06080B";
export const SOLAT_FG = "rgba(255,255,255,.32)";

export const FONT = "var(--font-manrope), sans-serif";
export const FONT_AR = "var(--font-noto-naskh-arabic), serif";