"use client";
// Kerawang Friday strip (theme contract rule 12): gold text on the timber band (≥ 7.8:1 in every phase;
// the usual 15 % gold tint failed AA on zohor and asar).
import type { CSSProperties } from "react";
import type { DisplayState } from "@/core";
import { FridayStripBase, type StripVariant } from "../shared/friday";
import { K } from "./tokens";

export function FridayStrip({ s, variant, style }: { s: DisplayState; variant?: StripVariant; style?: CSSProperties }) {
  return <FridayStripBase s={s} accent={K.gold} fill={K.band} variant={variant} radius={variant === "card" ? 18 : undefined} style={{ border: `3px solid ${K.border}`, ...style }} />;
}
