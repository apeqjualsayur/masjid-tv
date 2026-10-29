"use client";
// Structural pieces of the announcement-only `poster` layout (contract rules 14–17), shared by every
// theme. No colours here: each theme draws its own card, brand chip and empty state.
import type { CSSProperties, ReactNode } from "react";
import type { PosterRect, TemplateArea } from "../types";

/** The themes' internal composition names ("wide" 12:5, "tall" 5:4) → the template `area` prop. */
export const templateAreaOf = (a: "wide" | "tall"): TemplateArea => (a === "wide" ? "bottom" : "side");

/** Rule 10 / 14: the poster layout's area is the whole 1920×1080 stage (16:9). */
export const POSTER_STAGE: PosterRect = { x: 0, y: 0, w: 1920, h: 1080 };
/** Rule 14: brand chip safe margin. */
export const CHIP_MARGIN = 48;
/** Rule 17. */
export const EMPTY_TEXT = "Tiada pengumuman buat masa ini";

/** Space kept around a scaled template: top/bottom, and left/right (room for the brand chip). */
const FIT_Y = 60;
const FIT_X = 340;

/** Scale factor that fits a w×h template box into the 16:9 stage, keeping the margins above. */
export function fitScale(w: number, h: number): number {
  return Math.min((POSTER_STAGE.h - 2 * FIT_Y) / h, (POSTER_STAGE.w - 2 * FIT_X) / w);
}

/**
 * Draws a template at the theme's own 5:4 content size (so it never clips) and scales it up to fill
 * the 16:9 stage height: larger type and generous side margins (rule 18).
 */
export function FitBox({ w, h, children, style }: { w: number; h: number; children: ReactNode; style?: CSSProperties }) {
  const k = fitScale(w, h);
  return (
    <div
      data-fit={k.toFixed(3)}
      style={{
        position: "absolute",
        left: (POSTER_STAGE.w - w * k) / 2,
        top: (POSTER_STAGE.h - h * k) / 2,
        width: w,
        height: h,
        boxSizing: "border-box",
        transform: `scale(${k})`,
        transformOrigin: "0 0",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
