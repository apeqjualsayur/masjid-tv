"use client";
// The jadual_petugas slide body (PRD enhancements §6.4, contract rule 25), shared by every theme: the
// theme passes its colours, eyebrow and heading font. minggu = 7 rows Hari | Imam | Bilal with today
// marked (fill + weight + a bar, never colour alone); hari_ini = today's 5 waktu + "Esok: …". Names
// shrink to fit down to 18 px, then end in "…". Rows share the height, so it fits 12:5 without scrolling.
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { TemplateLive } from "@/templates";

export interface RosterStyle {
  ink: string;
  muted: string;
  /** Today's marker bar */
  accent: string;
  line: string;
  /** Today's row background (on the theme's card) */
  todayFill: string;
  titleFont?: string;
}

export const ROSTER_EYEBROW = "Imam & Bilal";
export const NAME_MIN_PX = 18;

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** One line of text that shrinks (1 px steps) to fit its box, down to `min`, then ellipsis. */
export function FitText({ text, max, min = NAME_MIN_PX, style }: { text: string; max: number; min?: number; style?: CSSProperties }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState(max);
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      let s = max;
      el.style.fontSize = `${s}px`;
      while (s > min && el.scrollWidth > el.clientWidth + 1) {
        s -= 1;
        el.style.fontSize = `${s}px`;
      }
      setSize(s);
    };
    fit();
    // Web fonts arrive after the first layout: measure again with the real glyphs.
    document.fonts?.ready.then(fit).catch(() => undefined);
  }, [text, max, min]);
  return (
    <span ref={ref} data-fit-text style={{ display: "block", minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: size, ...style }}>
      {text}
    </span>
  );
}

export function RosterBody({ live, s, area, eyebrow }: { live?: TemplateLive["roster"]; s: RosterStyle; area: "wide" | "tall"; eyebrow: ReactNode }) {
  const wide = area === "wide";
  const col: CSSProperties = { display: "flex", flexDirection: "column", height: "100%", minHeight: 0, color: s.ink, gap: wide ? 14 : 18 };
  if (!live) return <div style={col}>{eyebrow}</div>;
  const week = live.view === "minggu";
  const nameMax = wide ? 32 : 30;
  const head: CSSProperties = { fontSize: 20, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: s.muted, padding: "0 16px 8px" };
  // 12:5 rows are short: the per-waktu marker sits beside the day name (one line), so the column is wider.
  const labelW = week ? (wide ? 300 : 190) : wide ? 210 : 170;

  return (
    <div data-roster={live.view} style={col}>
      {eyebrow}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 20, rowGap: 4 }}>
        <div style={{ fontFamily: s.titleFont, fontSize: wide ? 52 : 50, fontWeight: 700, lineHeight: 1.05, letterSpacing: -1 }}>{live.title}</div>
        {live.subtitle && <div style={{ fontSize: wide ? 30 : 28, fontWeight: 700, color: s.muted }}>{live.subtitle}</div>}
      </div>
      <div
        role="table"
        style={{ display: "grid", gridTemplateColumns: `${labelW}px minmax(0, 1fr) minmax(0, 1fr)`, gridTemplateRows: `auto repeat(${live.rows.length}, minmax(0, 1fr))`, flex: 1, minHeight: 0 }}
      >
        <div role="columnheader" style={head}>{week ? "Hari" : "Waktu"}</div>
        <div role="columnheader" style={head}>Imam</div>
        <div role="columnheader" style={head}>Bilal</div>
        {live.rows.map((r) => {
          const cell: CSSProperties = {
            display: "flex",
            alignItems: "center",
            minWidth: 0,
            padding: "0 16px",
            borderTop: `1.5px solid ${s.line}`,
            background: r.today ? s.todayFill : "transparent",
            fontWeight: r.today ? 800 : 500,
          };
          return (
            <div key={r.label} role="row" data-today={r.today ? "" : undefined} style={{ display: "contents" }}>
              <div role="cell" style={{ ...cell, columnGap: 10, rowGap: 0, flexWrap: wide ? "nowrap" : "wrap", alignContent: "center", lineHeight: 1.1, boxShadow: r.today ? `inset 6px 0 0 ${s.accent}` : undefined }}>
                <span style={{ fontSize: wide ? 30 : 28 }}>{r.label}</span>
                {r.perWaktu && <span data-per-waktu style={{ fontSize: 18, fontWeight: 700, color: s.muted, whiteSpace: "nowrap" }}>+ ikut waktu</span>}
              </div>
              <div role="cell" style={cell}>
                <FitText text={r.imam} max={nameMax} style={{ color: r.imam === "—" ? s.muted : s.ink }} />
              </div>
              <div role="cell" style={cell}>
                <FitText text={r.bilal} max={nameMax} style={{ color: r.bilal === "—" ? s.muted : s.ink }} />
              </div>
            </div>
          );
        })}
      </div>
      {live.tomorrow && (
        <div data-tomorrow style={{ flex: "none", borderTop: `1.5px solid ${s.line}`, paddingTop: 12 }}>
          <FitText text={live.tomorrow} max={wide ? 28 : 26} style={{ color: s.muted, fontWeight: 600 }} />
        </div>
      )}
    </div>
  );
}
