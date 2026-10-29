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

/** Where a template is drawn: bottom = 12:5, side = 5:4, poster = 16:9 full stage (contract rules 10, 18). */
export type TemplateArea = "bottom" | "side" | "poster";

export type TemplateComponents = {
  [K in TemplateKey]: FC<{ s: DisplayState; fields: TemplateFields[K]; area: TemplateArea }>;
};

/** A poster box inside the 1920×1080 stage. */
export interface PosterRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ThemeDefinition {
  id: ThemeId;
  /** shown in admin: "Alam", "Serambi", "Tenang" */
  name: string;
  /** font families used (self-hosted in src/app/fonts.ts) */
  fonts: string[];
  layouts: Record<LayoutKey, FC<LayoutProps>>;
  /** Poster/announcement box per layout (contract rule 10); poster = the full stage. */
  posterArea: Record<TemplateArea, PosterRect>;
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