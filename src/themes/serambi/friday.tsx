"use client";
// Serambi Friday strip (theme contract rule 12): always gold, gold at low opacity behind it.
import type { CSSProperties } from "react";
import type { DisplayState } from "@/core";
import { FridayStripBase, type StripVariant } from "../shared/friday";
import { C } from "./tokens";

export function FridayStrip({ s, variant, style }: { s: DisplayState; variant?: StripVariant; style?: CSSProperties }) {
  return <FridayStripBase s={s} accent={C.gold} fill="rgba(227,176,75,0.14)" variant={variant} radius={variant === "card" ? 18 : undefined} style={{ border: "1px solid rgba(227,176,75,0.4)", ...style }} />;
}
