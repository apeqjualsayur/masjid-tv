"use client";
import type { DisplayState, WaktuKey, WaktuView } from "@/core";
import { createContext, useContext, useState, type CSSProperties, type ReactNode } from "react";
import { A, FONT, FONT_AR, glass } from "./tokens";

export const num: CSSProperties = { fontVariantNumeric: "tabular-nums" };

export function Page({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ position: "relative", width: 1920, height: 1080, overflow: "hidden", fontFamily: FONT, color: A.white, ...style }}>
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

/** White disc with the masjid logo, or the green monogram if there is none (or it fails to load). */
export function Logo({ masjid, size, lite }: { masjid: DisplayState["masjid"]; size: number; lite: boolean }) {
  const [failed, setFailed] = useState(false);
  const disc: CSSProperties = {
    width: size,
    height: size,
    flex: "none",
    borderRadius: 999,
    background: A.white,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    boxShadow: lite ? "none" : "0 8px 24px rgba(0,0,0,0.2)",
  };
  if (masjid.logoUrl && !failed) {
    return (
      <div style={disc}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={masjid.logoUrl} alt="" onError={() => setFailed(true)} style={{ width: "78%", height: "78%", objectFit: "contain" }} />
      </div>
    );
  }
  return <div style={{ ...disc, fontSize: Math.round(size * 0.36), fontWeight: 800, color: A.green }}>{masjid.shortName}</div>;
}

/** Line icons for each waktu (from designs/A-Full). */
const WAKTU_ICON: Record<WaktuKey, string> = {
  imsak: "M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z",
  subuh: "M3 18h18 M7 18a5 5 0 0 1 10 0 M12 5v3 M5.6 9.6l1.8 1.8 M18.4 9.6l-1.8 1.8",
  syuruk: "M3 20h18 M6 16a6 6 0 0 1 12 0 M12 3v5 M9 6l3-3 3 3",
  zohor: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z M12 2v2 M12 20v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2 12h2 M20 12h2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4",
  asar: "M12 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z M12 2v2 M5 5l1.4 1.4 M19 5l-1.4 1.4 M3 20h18",
  maghrib: "M3 18h18 M7 18a5 5 0 0 1 10 0 M12 10V3 M9 7l3 3 3-3",
  isyak: "M19 14A7.5 7.5 0 1 1 10 5a6 6 0 0 0 9 9Z M17 3l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7Z",
};

export function Icon({ d, size, width = 1.8, color = "currentColor" }: { d: string; size: number; width?: number; color?: string }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }}>
      <path d={d} />
    </svg>
  );
}

export const WaktuIcon = ({ k, size }: { k: WaktuKey; size: number }) => <Icon d={WAKTU_ICON[k]} size={size} />;

/** SEKARANG (green on white card) / SETERUSNYA (yellow). */
export function StateChip({ w, size = 15 }: { w: WaktuView; size?: number }) {
  if (w.state !== "current" && w.state !== "next") return null;
  const cur = w.state === "current";
  return (
    <div
      style={{
        padding: "6px 12px",
        borderRadius: 999,
        fontSize: size,
        fontWeight: 800,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        background: cur ? A.green : A.yellow,
        color: cur ? A.white : A.yellowFg,
        whiteSpace: "nowrap",
      }}
    >
      {cur ? "Sekarang" : "Seterusnya"}
    </div>
  );
}

/**
 * Card look per state: current = white card, dark text (different fill AND weight);
 * next = yellow 2px border; others = glass. `others` sets the non-current background.
 */
export function cardLook(w: WaktuView, lite: boolean, others: "glass" | "subtle", radius: number): CSSProperties {
  const cur = w.state === "current";
  const base = cur ? { background: A.current } : others === "glass" ? glass(lite) : { background: lite ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.06)" };
  return {
    ...base,
    borderRadius: radius,
    boxSizing: "border-box",
    border: w.state === "next" ? `2px solid ${A.yellow}` : cur ? `2px solid ${A.current}` : others === "glass" ? A.glassBorder : "1px solid rgba(255,255,255,0.16)",
    color: cur ? A.currentFg : A.white,
  };
}

/** "Asar dalam 2 jam 51 minit", or the next name alone when its time is unknown. */
export const countdownLine = (s: DisplayState) => (s.countdownText ? `${s.next.label} dalam ${s.countdownText}` : `${s.next.label} seterusnya`);

/** Template area: the wide light card (bottom) or the tall one (side). */
export type Area = "wide" | "tall";
export const AreaContext = createContext<Area>("wide");
export const useArea = () => useContext(AreaContext);

/** Islamic 8-point star outline used as quiet decoration on cards. */
export function Star8({ size, color, opacity, style, circle }: { size: number; color: string; opacity: number; style?: CSSProperties; circle?: boolean }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth={circle ? 1.2 : 0.4} style={{ position: "absolute", opacity, ...style }}>
      <rect x={18} y={18} width={64} height={64} />
      <rect x={18} y={18} width={64} height={64} transform="rotate(45 50 50)" />
      {circle ? <circle cx={50} cy={50} r={18} /> : (
        <>
          <rect x={28} y={28} width={44} height={44} />
          <rect x={28} y={28} width={44} height={44} transform="rotate(45 50 50)" />
        </>
      )}
    </svg>
  );
}