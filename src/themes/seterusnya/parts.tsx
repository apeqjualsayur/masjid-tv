"use client";
// Seterusnya building blocks: page, logo, Arabic, caps label, countdown ring, waktu cells and the
// iqamah / khutbah value of a waktu, template area context.
import type { DisplayState, WaktuView } from "@/core";
import { createContext, useContext, useState, type CSSProperties, type ReactNode } from "react";
import { BG, FONT, FONT_AR, S } from "./tokens";

export const num: CSSProperties = { fontVariantNumeric: "tabular-nums" };
export const bgOf = (s: { phase: DisplayState["phase"] }) => BG[s.phase];

export function Page({ s, children, style }: { s: { phase: DisplayState["phase"] }; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ position: "relative", width: 1920, height: 1080, overflow: "hidden", fontFamily: FONT, background: bgOf(s), color: S.text, ...style }}>
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

/** Masjid logo, or the white arch mark from designs/K-* (no tiny text). */
export function Logo({ masjid, size, color = S.text }: { masjid: DisplayState["masjid"]; size: number; color?: string }) {
  const [failed, setFailed] = useState(false);
  if (masjid.logoUrl && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={masjid.logoUrl} alt="" onError={() => setFailed(true)} style={{ width: size, height: size, objectFit: "contain", flex: "none" }} />;
  }
  return (
    <svg width={size * 0.83} height={size} viewBox="0 0 40 48" aria-hidden="true" style={{ flex: "none" }}>
      <path d="M6 46V20a14 14 0 0 1 28 0v26" fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" />
      <circle cx={20} cy={24} r={5} fill={color} />
    </svg>
  );
}

/** Spaced caps label ("SETERUSNYA", "AZAN"). Full white: any opacity drops below AA on asar. */
export function Caps({ children, size, spacing = "0.2em", style }: { children: ReactNode; size: number; spacing?: string; style?: CSSProperties }) {
  return <div style={{ fontSize: size, fontWeight: 700, letterSpacing: spacing, textTransform: "uppercase", whiteSpace: "nowrap", ...style }}>{children}</div>;
}

/** Iqamah time (PRD D5); Friday Zohor shows the khutbah start instead; Imsak/Syuruk nothing. */
export function secondTime(w: WaktuView, s: Pick<DisplayState, "isFriday" | "friday">): { kind: "iqamah" | "khutbah"; time: string } | undefined {
  if (w.iqamah) return { kind: "iqamah", time: w.iqamah };
  if (s.isFriday && w.key === "zohor" && s.friday) return { kind: "khutbah", time: s.friday.khutbahStart };
  return undefined;
}

/**
 * Countdown ring (viewBox 340, r 150 as in designs/K-*). `remaining` 1 → 0 comes from core
 * countdownRing; the caller decides how often it changes (Full: every second, Bottom: every minute).
 */
export function Ring({ size, stroke, remaining, children }: { size: number; stroke: number; remaining: number; children?: ReactNode }) {
  const C = 2 * Math.PI * 150;
  const sw = (stroke * 340) / size; // stroke in viewBox units
  return (
    <div data-ring={remaining.toFixed(3)} style={{ position: "relative", width: size, height: size, flex: "none" }}>
      <svg viewBox="0 0 340 340" width={size} height={size} role="img" aria-label="Baki masa ke waktu seterusnya">
        <circle cx={170} cy={170} r={150} fill="none" stroke={S.ringTrack} strokeWidth={sw} />
        <circle cx={170} cy={170} r={150} fill="none" stroke={S.ring} strokeWidth={sw} strokeLinecap="round" strokeDasharray={`${(C * remaining).toFixed(1)} ${C.toFixed(1)}`} transform="rotate(-90 170 170)" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>{children}</div>
    </div>
  );
}

/** Cell look (contract §9 + rule 2): next = white fill with phase ink; current = darker fill, white border, heavier type. */
export function cellLook(w: WaktuView, s: { phase: DisplayState["phase"] }) {
  if (w.state === "next") return { background: S.next, color: bgOf(s), border: "transparent", name: 800, time: 700 };
  if (w.state === "current") return { background: S.current, color: S.text, border: S.currentBorder, name: 800, time: 700 };
  return { background: S.cell, color: S.text, border: "transparent", name: 700, time: 500 };
}

export interface CellSize {
  name: number;
  time: number;
  small: number;
  radius: number;
}

/** Strip / bar cell: name, azan time, and "iqamah 1:15" / "khutbah 1:03" under it. */
export function WaktuCell({ w, s, size }: { w: WaktuView; s: DisplayState; size: CellSize }) {
  const look = cellLook(w, s);
  const second = secondTime(w, s);
  return (
    <div
      data-cell={w.key}
      data-state={w.state}
      style={{
        flex: 1,
        minWidth: 0,
        boxSizing: "border-box",
        borderRadius: size.radius,
        border: `3px solid ${look.border}`,
        background: look.background,
        color: look.color,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        whiteSpace: "nowrap",
      }}
    >
      <div style={{ fontSize: size.name, fontWeight: look.name }}>{w.label}</div>
      <div data-time style={{ fontSize: size.time, fontWeight: look.time, lineHeight: 1.1, ...num }}>
        {w.time}
      </div>
      <div data-second={second?.kind ?? "none"} style={{ fontSize: size.small, fontWeight: 500, minHeight: Math.round(size.small * 1.25), ...num }}>
        {second ? `${second.kind} ${second.time}` : ""}
      </div>
    </div>
  );
}

/** Where a template is drawn: wide (12:5 bottom) or tall (5:4 side, and the 16:9 poster scaled up). */
export type Area = "wide" | "tall";
export const AreaContext = createContext<Area>("wide");
export const useArea = () => useContext(AreaContext);
