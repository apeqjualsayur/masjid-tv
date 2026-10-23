"use client";
// Tenang Friday strip (theme contract rule 12): the phase accent, its low-opacity fill.
import type { CSSProperties } from "react";
import type { DisplayState } from "@/core";
import { FridayStripBase, type StripVariant } from "../shared/friday";
import { tokensOf } from "./parts";

export function FridayStrip({ s, variant, style }: { s: DisplayState; variant?: StripVariant; style?: CSSProperties }) {
  const t = tokensOf(s);
  return <FridayStripBase s={s} accent={t.accent} fill={`${t.accent}1F`} variant={variant} radius={variant === "card" ? 28 : undefined} style={style} />;
}
