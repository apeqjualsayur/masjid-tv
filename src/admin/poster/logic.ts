// Poster rules (PRD Phase 2 §6, designs/admin/Poster + D-Poster; round 2 §6). Pure: no React, no Supabase.
import type { ThemeId } from "@/core";

/** Layouts with a poster area; "poster" = "Pengumuman sahaja", the whole 16:9 stage (round 2). */
export type PosterLayout = "bottom" | "side" | "poster";
export type AnyLayout = PosterLayout | "full";

/** Poster area on the 1920×1080 TV per layout (theme contract §2.10: 12:5, 5:4, 16:9). */
export const SLOTS: Record<PosterLayout, { w: number; h: number }> = {
  bottom: { w: 1920, h: 800 },
  side: { w: 1350, h: 1080 },
  poster: { w: 1920, h: 1080 },
};
export const TV = { w: 1920, h: 1080 } as const;

export const MAX_INPUT_BYTES = 10 * 1024 * 1024;
export const ACCEPT = ["image/jpeg", "image/png", "image/webp"] as const;
export const MIN_WIDTH = 1080;
export const MAX_UPSCALE = 1.4;
export const LONG_EDGE = 1920;
export const QUALITY = 0.82;

/** i18n key when a picked file cannot be used, else null. */
export function fileError(type: string, bytes: number): string | null {
  if (!(ACCEPT as readonly string[]).includes(type)) return "poster.err.type";
  if (bytes > MAX_INPUT_BYTES) return "poster.err.tooBig";
  if (bytes <= 0) return "poster.err.empty";
  return null;
}

export type Shape = "landscape" | "portrait" | "square";
export function shapeOf(w: number, h: number): Shape {
  const a = w / h;
  return a > 1.15 ? "landscape" : a < 0.87 ? "portrait" : "square";
}

/** Output size: long edge at most 1920 px, never enlarged. */
export function outputSize(w: number, h: number, longEdge = LONG_EDGE): { w: number; h: number } {
  const k = Math.min(1, longEdge / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
}

export type FitLabel = "full" | "blur" | "small";

export interface Fit {
  /** Share of the poster area the image covers (contain). */
  coverage: number;
  label: FitLabel;
  /** How much the TV enlarges the image to fit (> 1 = upscaled). */
  scale: number;
  /** Contained image box inside the slot, as fractions of the slot (for previews). */
  box: { x: number; y: number; w: number; h: number };
}

/** How a w×h poster sits in a layout's poster area: contain, the rest blurred. */
export function fitOn(w: number, h: number, layout: PosterLayout): Fit {
  const slot = SLOTS[layout];
  const scale = Math.min(slot.w / w, slot.h / h);
  const bw = (w * scale) / slot.w;
  const bh = (h * scale) / slot.h;
  const coverage = bw * bh;
  const label: FitLabel = coverage >= 0.85 ? "full" : coverage >= 0.5 ? "blur" : "small";
  return { coverage, label, scale, box: { x: (1 - bw) / 2, y: (1 - bh) / 2, w: bw, h: bh } };
}

export interface Resolution {
  ok: boolean;
  /** Largest enlargement on any target layout. */
  maxScale: number;
  lowWidth: boolean;
  upscaled: boolean;
}

/** Layouts judged when no screen has a poster area yet. */
export const GENERIC_LAYOUTS: PosterLayout[] = ["bottom", "side"];

/**
 * Resolution warning: upscaled > 1.4× on any target layout (a poster screen is judged on its
 * 16:9 area), or narrower than 1080 px. No targets = the bottom and side areas.
 */
export function resolutionCheck(w: number, h: number, layouts: PosterLayout[]): Resolution {
  const targets = layouts.length ? layouts : GENERIC_LAYOUTS;
  const maxScale = Math.max(...targets.map((l) => fitOn(w, h, l).scale));
  const upscaled = maxScale > MAX_UPSCALE;
  const lowWidth = w < MIN_WIDTH;
  return { ok: !upscaled && !lowWidth, maxScale, lowWidth, upscaled };
}

/** Layouts (of the target screens) where this poster fits well, and where it does not. */
export function layoutAdvice(w: number, h: number, layouts: PosterLayout[]): { good: PosterLayout[]; weak: PosterLayout[] } {
  const uniq = [...new Set(layouts)];
  const good = uniq.filter((l) => fitOn(w, h, l).label === "full");
  return { good, weak: uniq.filter((l) => !good.includes(l)) };
}

export interface ScreenLite {
  id: string;
  name: string;
  theme: ThemeId;
  layout: AnyLayout;
  revoked_at?: string | null;
}

/** One row per non-revoked screen, poster layouts first. */
export function recommendedRows(screens: ScreenLite[]): { screen: ScreenLite; slot: { w: number; h: number } | null }[] {
  return screens
    .filter((s) => !s.revoked_at)
    .map((s) => ({ screen: s, slot: s.layout === "full" ? null : SLOTS[s.layout] }))
    .sort((a, b) => Number(!a.slot) - Number(!b.slot) || a.screen.name.localeCompare(b.screen.name, "ms"));
}