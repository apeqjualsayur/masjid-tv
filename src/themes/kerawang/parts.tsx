"use client";
// Kerawang building blocks: page (timber wall + carvings), logo, Arabic, status label, the arch and row
// panels, and the template area context.
import type { DisplayState, WaktuView } from "@/core";
import { createContext, useContext, useState, type CSSProperties, type ReactNode } from "react";
import { Carving, Patterns } from "./patterns";
import { BG, FONT, FONT_AR, GRAIN, K, OPACITY, SERIF } from "./tokens";

export const num: CSSProperties = { fontVariantNumeric: "tabular-nums" };
export const serif: CSSProperties = { fontFamily: SERIF };
export const bgOf = (s: { phase: DisplayState["phase"] }) => BG[s.phase];

/** The 1920×1080 stage: phase colour, timber grain (not in lite) and the carving pattern defs. */
export function Page({ s, children, style }: { s: { phase: DisplayState["phase"]; lite?: boolean }; children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      data-grain={s.lite ? undefined : "true"}
      style={{ position: "relative", width: 1920, height: 1080, overflow: "hidden", fontFamily: FONT, backgroundColor: bgOf(s), backgroundImage: s.lite ? "none" : GRAIN, color: K.text, ...style }}
    >
      <Patterns>{children}</Patterns>
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

/** Masjid logo, or the gold arch mark from designs/J-* (no tiny text). */
export function Logo({ masjid, size, arch = K.gold, dot = K.text }: { masjid: DisplayState["masjid"]; size: number; arch?: string; dot?: string }) {
  const [failed, setFailed] = useState(false);
  if (masjid.logoUrl && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={masjid.logoUrl} alt="" onError={() => setFailed(true)} style={{ width: size, height: size, objectFit: "contain", flex: "none" }} />;
  }
  return (
    <svg width={size * 0.83} height={size} viewBox="0 0 40 48" aria-hidden="true" style={{ flex: "none" }}>
      <path d="M6 46V20a14 14 0 0 1 28 0v26" fill="none" stroke={arch} strokeWidth={4} strokeLinecap="round" />
      <circle cx={20} cy={24} r={5} fill={dot} />
    </svg>
  );
}

/** Small caps label in gold ("● WAKTU ZOHOR"). */
export function Status({ children, size, color = K.gold }: { children: ReactNode; size: number; color?: string }) {
  return <div style={{ fontSize: size, fontWeight: 700, letterSpacing: "0.16em", color, textTransform: "uppercase", whiteSpace: "nowrap" }}>{children}</div>;
}

/** "Asar dalam 2 jam 51 minit", or "Asar seterusnya" when the time is unknown. */
export const nextLine = (s: DisplayState) => (s.countdownText ? `${s.next.label} dalam ${s.countdownText}` : `${s.next.label} seterusnya`);

/** Panel look per waktu: current gold-lit; past dim; Imsak/Syuruk slightly dim (designs/J-*). */
export function panelLook(w: WaktuView) {
  const lit = w.state === "current";
  const opacity = lit ? OPACITY.normal : w.state === "past" ? OPACITY.past : w.isMarker ? OPACITY.marker : OPACITY.normal;
  return { lit, opacity };
}

export interface ArchSize {
  /** arch radius at the top, corner radius at the bottom */
  top: number;
  bottom: number;
  border: number;
  plaque: number;
  name: number;
  time: number;
  glow: string;
}

/** Full / Bottom: an arch-topped timber panel, carving above, name + time on the plaque below. */
export function ArchPanel({ w, s, size }: { w: WaktuView; s: DisplayState; size: ArchSize }) {
  const { lit, opacity } = panelLook(w);
  return (
    <div
      data-panel={w.key}
      data-state={w.state}
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxSizing: "border-box",
        borderRadius: `${size.top}px ${size.top}px ${size.bottom}px ${size.bottom}px`,
        border: `${size.border}px solid ${lit ? K.gold : K.border}`,
        background: K.timber,
        boxShadow: lit && !s.lite ? size.glow : "none",
        opacity,
      }}
    >
      <Carving lit={lit} style={{ flex: 1, minHeight: 0 }} />
      <div
        style={{
          height: size.plaque,
          flex: "none",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
          background: lit ? K.gold : K.plaque,
          color: lit ? K.timber : K.text,
        }}
      >
        <div style={{ ...serif, fontSize: size.name, fontWeight: 600, whiteSpace: "nowrap" }}>{w.label}</div>
        <div data-time style={{ fontSize: size.time, fontWeight: lit ? 700 : 500, lineHeight: 1.05, whiteSpace: "nowrap", ...num }}>
          {w.time}
        </div>
      </div>
    </div>
  );
}

/** Side: one row per waktu, a carving strip on the left and the plaque to the right (designs/J-Side). */
export function RowPanel({ w, s }: { w: WaktuView; s: DisplayState }) {
  const { lit, opacity } = panelLook(w);
  return (
    <div
      data-panel={w.key}
      data-state={w.state}
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        overflow: "hidden",
        boxSizing: "border-box",
        borderRadius: 18,
        border: `4.5px solid ${lit ? K.gold : K.border}`,
        background: K.timber,
        boxShadow: lit && !s.lite ? "0 0 54px 4.5px rgba(242,196,90,0.5)" : "none",
        opacity,
      }}
    >
      <Carving lit={lit} style={{ width: 105, flex: "none" }} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 27px", background: lit ? K.gold : K.plaque, color: lit ? K.timber : K.text }}>
        <div style={{ ...serif, fontSize: 34.5, fontWeight: 600 }}>{w.label}</div>
        <div data-time style={{ fontSize: 54, fontWeight: lit ? 700 : 500, lineHeight: 1, ...num }}>
          {w.time}
        </div>
      </div>
    </div>
  );
}

/** Where a template is drawn: wide (12:5 bottom) or tall (5:4 side, and the 16:9 poster scaled up). */
export type Area = "wide" | "tall";
export const AreaContext = createContext<Area>("wide");
export const useArea = () => useContext(AreaContext);
