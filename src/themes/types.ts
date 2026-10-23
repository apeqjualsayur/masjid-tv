// Theme interface (_specs/01-theme-contract.md section 1). Themes only render; the engine
// (src/core) computes everything they show.
import type { FC } from "react";
import type { DisplayState, LayoutKey, ThemeId } from "@/core";
import type { SlideView, TemplateFields, TemplateKey } from "@/templates";

export type { SlideView };

export interface LayoutProps {
  s: DisplayState;
  slide?: SlideView;
  /** Changes when the playlist moves to another slide; drives the cross-fade. */
  slideKey?: string;
  /** "2 / 6" counter; hidden when there is only one slide. */
  counter?: { position: number; total: number };
}

/**
 * Shown instead of everything else when there is no trustworthy prayer data
 * ("Data waktu tidak tersedia"). Not in contract v0.1; added so each theme styles it.
 */
export interface UnavailableState {
  clock: string;
  seconds: string;
  gregorian: string;
  message: string;
  masjid: DisplayState["masjid"];
  lite: boolean;
}

export type TemplateComponents = {
  [K in TemplateKey]: FC<{ s: DisplayState; fields: TemplateFields[K] }>;
};

export interface ThemeDefinition {
  id: ThemeId;
  /** shown in admin: "Alam", "Serambi", "Tenang" */
  name: string;
  /** font families used (self-hosted in src/app/fonts.ts) */
  fonts: string[];
  layouts: Record<LayoutKey, FC<LayoutProps>>;
  screens: {
    preAzanBanner: FC<{ s: DisplayState }>;
    azan: FC<{ s: DisplayState }>;
    iqamah: FC<{ s: DisplayState }>;
    solat: FC<{ s: DisplayState }>;
    khutbah: FC<{ s: DisplayState }>;
    unavailable: FC<{ u: UnavailableState }>;
  };
  /** all 10 */
  templates: TemplateComponents;
  posterFrame: FC<{ s: DisplayState; imageUrl: string }>;
  /** Friday strip (contract rule 12), one-line pill; renders nothing when s.friday is unset. */
  fridayInfo: FC<{ s: DisplayState }>;
}