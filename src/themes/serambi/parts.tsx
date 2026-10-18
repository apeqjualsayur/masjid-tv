"use client";
import type { DisplayState, WaktuView } from "@/core";
import { createContext, useContext, useState, type CSSProperties, type ReactNode } from "react";
import { C, F, RING_NEXT, SKY, archRadius, ringCurrent } from "./tokens";

const num: CSSProperties = { fontFamily: F.num, fontVariantNumeric: "tabular-nums" };
export const numStyle = num;

/** The full 1920x1080 page on the dark colonnade background. */
export function Page({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ position: "relative", width: 1920, height: 1080, overflow: "hidden", fontFamily: F.body, background: C.bg, color: C.white, ...style }}>
      {children}
    </div>
  );
}

export function Kufi({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <span lang="ar" dir="rtl" style={{ fontFamily: F.kufi, ...style }}>
      {children}
    </span>
  );
}

export function Amiri({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div lang="ar" dir="rtl" style={{ fontFamily: F.amiri, ...style }}>
      {children}
    </div>
  );
}

/** Masjid logo, or the gold-ringed monogram if there is none (or it fails to load). */
export function Logo({ masjid, size }: { masjid: DisplayState["masjid"]; size: number }) {
  const [failed, setFailed] = useState(false);
  if (masjid.logoUrl && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={masjid.logoUrl} alt="" onError={() => setFailed(true)} style={{ width: size, height: size, objectFit: "contain", flex: "none" }} />;
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        flex: "none",
        boxSizing: "border-box",
        borderRadius: 999,
        border: `2px solid ${C.gold}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.round(size * 0.34),
        fontWeight: 600,
        color: C.gold,
      }}
    >
      {masjid.shortName}
    </div>
  );
}

/** Spaced caps label in gold ("SETERUSNYA", "TEMPAT"). */
export function Caps({ children, size = 22, spacing = 0.24, color = C.gold, weight = 600 }: { children: ReactNode; size?: number; spacing?: number; color?: string; weight?: number }) {
  return <div style={{ fontSize: size, fontWeight: weight, letterSpacing: `${spacing}em`, textTransform: "uppercase", color }}>{children}</div>;
}

export function GoldRule({ margin = "0" }: { margin?: string }) {
  return <div style={{ width: 80, height: 2, background: C.goldRule, margin, flex: "none" }} />;
}

export function Chip({ current, children, size = 15 }: { current: boolean; children: ReactNode; size?: number }) {
  return (
    <div
      style={{
        padding: size > 14 ? "6px 14px" : "4px 10px",
        borderRadius: 999,
        background: current ? C.gold : C.chipDark,
        color: current ? C.goldOn : C.gold,
        fontSize: size,
        fontWeight: 700,
        letterSpacing: "0.14em",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );
}

/** Ring, glow and opacity for an arch from its state (contract section 4). */
export function archLook(w: WaktuView, glowPx: number, lite: boolean) {
  const cur = w.state === "current";
  return {
    opacity: cur ? 1 : w.state === "past" ? 0.42 : 0.92,
    boxShadow: cur ? ringCurrent(glowPx, lite) : w.state === "next" ? RING_NEXT : "none",
  };
}

/** The current arch's glow colour, or the next arch's when nothing is current (Syuruk to Zohor). */
export function ambientGlow(s: DisplayState): string {
  return SKY[(s.current ?? s.next).key].glow;
}

/** An arch window showing its waktu's sky. */
export function ArchWindow({
  w,
  width,
  height,
  bottomRadius = 18,
  overlay,
  look,
  children,
}: {
  w: WaktuView;
  width: number;
  height: number;
  bottomRadius?: number;
  overlay: string;
  look: { opacity: number; boxShadow: string };
  children: ReactNode;
}) {
  return (
    <div
      data-arch={w.key}
      style={{
        position: "relative",
        width,
        height,
        flex: "none",
        borderRadius: archRadius(width, bottomRadius),
        overflow: "hidden",
        background: SKY[w.key].sky,
        opacity: look.opacity,
        boxShadow: look.boxShadow,
      }}
    >
      <div style={{ position: "absolute", inset: 0, background: overlay }} />
      {children}
    </div>
  );
}

/** Where a template is drawn: the wide emerald panel (bottom) or the tall arch frame (side). */
export type Area = "wide" | "tall";
export const AreaContext = createContext<Area>("wide");
export const useArea = () => useContext(AreaContext);

/** "Asar dalam 2 jam 51 minit", or the next name alone when its time is unknown. */
export const countdownLine = (s: DisplayState) => (s.countdownText ? `${s.next.label} dalam ${s.countdownText}` : `${s.next.label} seterusnya`);