"use client";
// Kerawang carvings (designs/J-*): SVG <pattern>s defined once per stage and only referenced by the panels.
// Simplified motifs - needs review by a Malay carving expert
// (PRD round 2 §5: the bunga/awan shapes here are placeholders in the spirit of kerawang, not real
// carving patterns; replace them after that review, before launch.)
//
// The <defs> are memoised on their ids, so the clock ticking re-renders the panels but never the patterns.
import { createContext, memo, useContext, useId, useMemo, type CSSProperties, type ReactNode } from "react";
import { AWAN, K, TILE } from "./tokens";

export interface PatternIds {
  /** gold-lit carving (current panel, iqamah light) */
  on: string;
  /** unlit carving (relief in a slightly lighter timber) */
  off: string;
  /** "awan larat" cloud scroll for the border bands */
  awan: string;
}

const Ids = createContext<PatternIds>({ on: "krw-on", off: "krw-off", awan: "krw-awan" });
export const usePatternIds = () => useContext(Ids);

/** One carving tile: a five-petal bunga with a diamond at each corner (tile 72, contract §8). */
function CarvingTile({ id, fill }: { id: string; fill: string }) {
  const c = TILE / 2;
  const r = TILE * 0.104; // 7.5
  const off = TILE * 0.292; // 21: petal distance from the centre
  const d = TILE * 0.146; // 10.5: half-diagonal of the corner diamonds
  const diamond = `M0 ${-d}L${d} 0L0 ${d}L${-d} 0Z`;
  return (
    <pattern id={id} width={TILE} height={TILE} patternUnits="userSpaceOnUse">
      <rect width={TILE} height={TILE} fill={K.timber} />
      <g fill={fill}>
        <circle cx={c} cy={c} r={r} />
        <circle cx={c} cy={c - off} r={r} />
        <circle cx={c} cy={c + off} r={r} />
        <circle cx={c - off} cy={c} r={r} />
        <circle cx={c + off} cy={c} r={r} />
        {[
          [0, 0],
          [TILE, 0],
          [0, TILE],
          [TILE, TILE],
        ].map(([x, y]) => (
          <path key={`${x}-${y}`} d={diamond} transform={`translate(${x} ${y})`} />
        ))}
      </g>
    </pattern>
  );
}

const PatternDefs = memo(function PatternDefs({ ids }: { ids: PatternIds }) {
  const { w, h } = AWAN;
  return (
    <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden="true" data-krw-defs>
      <defs>
        <CarvingTile id={ids.on} fill={K.gold} />
        <CarvingTile id={ids.off} fill={K.carving} />
        <pattern id={ids.awan} width={w} height={h} patternUnits="userSpaceOnUse">
          <path d={`M0 ${h / 2}C${w / 6} 0 ${w / 3} 0 ${w / 2} ${h / 2}S${(w * 5) / 6} ${h} ${w} ${h / 2}`} fill="none" stroke={K.awan} strokeWidth={4.5} strokeLinecap="round" />
          <circle cx={w / 4} cy={h * 0.27} r={3.75} fill={K.awan} />
          <circle cx={(w * 3) / 4} cy={h * 0.73} r={3.75} fill={K.awan} />
        </pattern>
      </defs>
    </svg>
  );
});
/** For the test: the defs component is memoised (drawn once, not per tick). */
export const PATTERN_DEFS = PatternDefs;

/** Puts the pattern defs into the stage once and gives the panels their (per-stage unique) ids. */
export function Patterns({ children }: { children: ReactNode }) {
  const raw = useId().replace(/[^A-Za-z0-9_-]/g, "");
  const ids = useMemo<PatternIds>(() => ({ on: `krw${raw}on`, off: `krw${raw}off`, awan: `krw${raw}awan` }), [raw]);
  return (
    <Ids.Provider value={ids}>
      <PatternDefs ids={ids} />
      {children}
    </Ids.Provider>
  );
}

/** A carved field filling its box: gold-lit or unlit. */
export function Carving({ lit, style }: { lit: boolean; style?: CSSProperties }) {
  const ids = usePatternIds();
  return (
    <svg width="100%" height="100%" style={{ display: "block", ...style }} aria-hidden="true" data-carving={lit ? "on" : "off"}>
      <rect width="100%" height="100%" fill={`url(#${lit ? ids.on : ids.off})`} />
    </svg>
  );
}

/** The 39 px "awan" band along the top or bottom edge of the stage. */
export function AwanBand({ edge }: { edge: "top" | "bottom" }) {
  const ids = usePatternIds();
  return (
    <svg width={1920} height={AWAN.h} style={{ position: "absolute", left: 0, [edge]: 0, display: "block" }} aria-hidden="true" data-awan>
      <rect width={1920} height={AWAN.h} fill={K.timber} />
      <rect width={1920} height={AWAN.h} fill={`url(#${ids.awan})`} />
    </svg>
  );
}
