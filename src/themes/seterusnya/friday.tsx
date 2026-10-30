"use client";
// Seterusnya Friday strip (theme contract rule 12): white text on the dark band (≥ 8:1 in every phase;
// a white tint would drop below AA on zohor and asar).
import type { CSSProperties } from "react";
import type { DisplayState } from "@/core";
import { FridayStripBase, type StripVariant } from "../shared/friday";
import { S } from "./tokens";

export function FridayStrip({ s, variant, style }: { s: DisplayState; variant?: StripVariant; style?: CSSProperties }) {
  return <FridayStripBase s={s} accent={S.text} fill={S.band} variant={variant} radius={variant === "card" ? 24 : undefined} style={style} />;
}
