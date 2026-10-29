"use client";
// Falak Friday strip (theme contract rule 12): gold text on gold at low opacity.
import type { CSSProperties } from "react";
import type { DisplayState } from "@/core";
import { FridayStripBase, type StripVariant } from "../shared/friday";
import { F } from "./tokens";

export function FridayStrip({ s, variant, style }: { s: DisplayState; variant?: StripVariant; style?: CSSProperties }) {
  return <FridayStripBase s={s} accent={F.gold} fill={`${F.gold}26`} variant={variant} radius={variant === "card" ? 21 : undefined} style={style} />;
}
