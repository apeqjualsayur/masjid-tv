"use client";
// Garis Masa Friday strip (theme contract rule 12): the phase accent on its low-opacity fill.
import type { CSSProperties } from "react";
import type { DisplayState } from "@/core";
import { FridayStripBase, type StripVariant } from "../shared/friday";
import { accent } from "./parts";

export function FridayStrip({ s, variant, style }: { s: DisplayState; variant?: StripVariant; style?: CSSProperties }) {
  const a = accent(s);
  return <FridayStripBase s={s} accent={a} fill={`${a}26`} variant={variant} radius={variant === "card" ? 21 : undefined} style={style} />;
}
