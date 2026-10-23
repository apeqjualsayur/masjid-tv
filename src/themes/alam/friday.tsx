"use client";
// Alam Friday strip (theme contract rule 12): the yellow accent at low opacity over the dark glass
// used by the rest of the theme, so it stays readable on every landscape.
import type { CSSProperties } from "react";
import type { DisplayState } from "@/core";
import { FridayStripBase, type StripVariant } from "../shared/friday";
import { A } from "./tokens";

export function FridayStrip({ s, variant, style }: { s: DisplayState; variant?: StripVariant; style?: CSSProperties }) {
  const fill = `linear-gradient(rgba(245,211,59,0.16), rgba(245,211,59,0.16)), ${s.lite ? A.glassLite : "rgba(8,18,28,0.5)"}`;
  return <FridayStripBase s={s} accent={A.yellow} fill={fill} variant={variant} radius={variant === "card" ? 18 : undefined} style={{ border: "1px solid rgba(245,211,59,0.6)", ...style }} />;
}
