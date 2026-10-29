"use client";
// Garis Masa building blocks: page, logo, Arabic, status label, template area context.
import type { DisplayState } from "@/core";
import { createContext, useContext, useState, type CSSProperties, type ReactNode } from "react";
import { BG, FONT, FONT_AR, G, SERIF, accentOf } from "./tokens";

export const num: CSSProperties = { fontVariantNumeric: "tabular-nums" };
export const serif: CSSProperties = { fontFamily: SERIF };
export const bgOf = (s: { phase: DisplayState["phase"] }) => BG[s.phase];
export const accent = (s: { phase: DisplayState["phase"] }) => accentOf(s.phase);

export function Page({ s, children, style }: { s: { phase: DisplayState["phase"] }; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ position: "relative", width: 1920, height: 1080, overflow: "hidden", fontFamily: FONT, background: bgOf(s), color: G.text, ...style }}>
      {children}
    </div>
  );
}

export function Arabic({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <span lang="ar" dir="rtl" style={{ fontFamily: FONT_AR, ...style }}>
      {children}
    </span>
  );
}

/** Masjid logo, or the arch mark from designs/I-* with an accent dot (no tiny text). */
export function Logo({ masjid, size, dot, color = G.text }: { masjid: DisplayState["masjid"]; size: number; dot: string; color?: string }) {
  const [failed, setFailed] = useState(false);
  if (masjid.logoUrl && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={masjid.logoUrl} alt="" onError={() => setFailed(true)} style={{ width: size, height: size, objectFit: "contain", flex: "none" }} />;
  }
  return (
    <svg width={size * 0.85} height={size} viewBox="0 0 40 48" aria-hidden="true" style={{ flex: "none" }}>
      <path d="M6 46V20a14 14 0 0 1 28 0v26" fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" />
      <circle cx={20} cy={24} r={5} fill={dot} />
    </svg>
  );
}

/** Small caps label in the accent ("● WAKTU ZOHOR"). */
export function Status({ children, size, color }: { children: ReactNode; size: number; color: string }) {
  return <div style={{ fontSize: size, fontWeight: 700, letterSpacing: "0.2em", color, textTransform: "uppercase" }}>{children}</div>;
}

/** "Baki 1j 49m ke Asar", or "Asar seterusnya" when the time is unknown. */
export const bakiLine = (s: DisplayState) => (s.countdownText ? `Baki ${s.countdownText} ke ${s.next.label}` : `${s.next.label} seterusnya`);

/** Where a template is drawn: wide (12:5 bottom) or tall (5:4 side, and the 16:9 poster scaled up). */
export type Area = "wide" | "tall";
export const AreaContext = createContext<Area>("wide");
export const useArea = () => useContext(AreaContext);
