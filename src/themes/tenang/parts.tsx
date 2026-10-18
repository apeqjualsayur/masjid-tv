"use client";
import type { DisplayState } from "@/core";
import { createContext, useContext, useState, type CSSProperties, type ReactNode } from "react";
import { FONT, FONT_AR, TOKENS, type TenangTokens } from "./tokens";

export const tokensOf = (s: { phase: DisplayState["phase"] }): TenangTokens => TOKENS[s.phase];

/** The full 1920x1080 page in phase colours. */
export function Page({ t, children, style }: { t: TenangTokens; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ position: "relative", width: 1920, height: 1080, overflow: "hidden", fontFamily: FONT, background: t.bg, color: t.fg, ...style }}>
      {children}
    </div>
  );
}

export function Dot({ color, size }: { color: string; size: number }) {
  return <div style={{ width: size, height: size, borderRadius: 999, background: color, flex: "none" }} />;
}

export function Arabic({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <span lang="ar" dir="rtl" style={{ fontFamily: FONT_AR, ...style }}>
      {children}
    </span>
  );
}

/** Masjid logo, or the outlined monogram from the designs if there is no logo (or it fails to load). */
export function Logo({ masjid, size, color }: { masjid: DisplayState["masjid"]; size: number; color: string }) {
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
        boxSizing: "border-box",
        borderRadius: 999,
        border: `1.5px solid ${color}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.round(size / 3),
        fontWeight: 600,
        flex: "none",
      }}
    >
      {masjid.shortName}
    </div>
  );
}

/** Small caps label above a template ("PENGUMUMAN"). Sober = no accent, no dot (Kematian). */
export function Eyebrow({ t, children, sober }: { t: TenangTokens; children: ReactNode; sober?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 22, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: sober ? t.muted : t.accent }}>
      {!sober && <Dot color={t.accent} size={10} />}
      {children}
    </div>
  );
}

/** Where a template is drawn: the wide, short bottom-layout card or the tall side-layout card. */
export type Area = "wide" | "tall";
export const AreaContext = createContext<Area>("wide");
export const useArea = () => useContext(AreaContext);

/** Ticker: one item at a time, changing every 12 s (calm, no scrolling). */
export function tickerItem(s: DisplayState): string {
  if (!s.ticker.length) return "";
  return s.ticker[Math.floor(s.now.getTime() / 12_000) % s.ticker.length];
}