"use client";
// Shared by all themes for the Friday strip (theme contract rule 12): the exact strip text and a
// fade in/out wrapper. No colours here: each theme styles the strip from its own tokens.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { DisplayState, FridayInfo } from "@/core";

export const FRIDAY_LABEL = "SOLAT JUMAAT";

/** The three parts of the strip text; a line may only break between them. */
export function fridayParts(f: FridayInfo): [string, string, string] {
  return [`Azan ${f.azan}`, `Khutbah ${f.khutbahStart} (±${f.khutbahMin} minit)`, `Solat ±${f.solatStart}`];
}

/** "Azan 1:05 · Khutbah 1:08 (±40 minit) · Solat ±1:48" */
export function fridayDetails(f: FridayInfo): string {
  return fridayParts(f).join(" · ");
}

/** "Dijangka tamat ±1:48" for the khutbah screen (rule 13). */
export const khutbahEndLine = (f: FridayInfo) => `Dijangka tamat ±${f.solatStart}`;

const FADE_MS = 600;

/**
 * Fades its children in when `show` turns true and out when it turns false (the only animation the
 * rule allows). Lite mode: appears and disappears at once.
 */
export function Fade({ show, lite, children }: { show: boolean; lite: boolean; children: ReactNode }) {
  const [mounted, setMounted] = useState(show);
  const [visible, setVisible] = useState(show && lite);
  useEffect(() => {
    if (show) {
      setMounted(true);
      if (lite) return setVisible(true);
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
    if (lite) return setMounted(false);
    const t = setTimeout(() => setMounted(false), FADE_MS);
    return () => clearTimeout(t);
  }, [show, lite]);
  if (!mounted) return null;
  return <div style={{ opacity: visible ? 1 : 0, transition: lite ? "none" : `opacity ${FADE_MS}ms ease` }}>{children}</div>;
}

/** Keeps the last info so the strip can fade out after s.friday is gone. */
function useLastFriday(s: DisplayState): FridayInfo | undefined {
  const last = useRef<FridayInfo | undefined>(s.friday);
  if (s.friday) last.current = s.friday;
  return last.current;
}

export type StripVariant = "pill" | "card";

/**
 * The strip itself. "pill": one line. "card": label above the details, wraps. Colours come from the
 * calling theme (accent text on the accent at low opacity); fonts are inherited from the page.
 */
export function FridayStripBase({ s, accent, fill, variant = "pill", radius, style }: { s: DisplayState; accent: string; fill: string; variant?: StripVariant; radius?: number; style?: CSSProperties }) {
  const f = useLastFriday(s);
  if (!f) return null;
  const card = variant === "card";
  return (
    <Fade show={Boolean(s.friday)} lite={s.lite}>
      <div
        data-friday-strip
        style={{
          display: "flex",
          flexDirection: card ? "column" : "row",
          alignItems: card ? "flex-start" : "center",
          gap: card ? 6 : 18,
          boxSizing: "border-box",
          padding: card ? "16px 26px" : "4px 26px",
          borderRadius: radius ?? (card ? 24 : 999),
          background: fill,
          color: accent,
          fontSize: 30,
          fontWeight: 600,
          lineHeight: 1.3,
          whiteSpace: card ? "normal" : "nowrap",
          fontVariantNumeric: "tabular-nums",
          ...style,
        }}
      >
        <span style={{ fontWeight: 800, letterSpacing: "0.08em" }}>{FRIDAY_LABEL}</span>
        <span>
          {fridayParts(f).map((part, i) => (
            <span key={i}>
              {i > 0 && " · "}
              <span style={{ whiteSpace: "nowrap" }}>{part}</span>
            </span>
          ))}
        </span>
      </div>
    </Fade>
  );
}

/** Thin progress line for the khutbah screen (rule 13): calm, no ticking digits. */
export function ProgressLine({ color, track, progress, lite, width = 720, style }: { color: string; track: string; progress: number; lite: boolean; width?: number; style?: CSSProperties }) {
  const pct = Math.round(Math.min(1, Math.max(0, progress)) * 1000) / 10;
  return (
    <div data-khutbah-progress style={{ width, height: 6, borderRadius: 3, background: track, overflow: "hidden", flex: "none", ...style }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, transition: lite ? "none" : "width 1s linear" }} />
    </div>
  );
}
