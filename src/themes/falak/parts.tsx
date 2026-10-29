"use client";
// Falak building blocks: page, logo, Arabic, the analogue dial (designs/G-*), template area context.
import { dialAngle, dialSweep, handAngles, withinNextHours, type DisplayState, type WaktuView } from "@/core";
import { createContext, useContext, useState, type CSSProperties, type ReactNode } from "react";
import { F, FONT, FONT_AR, MARKER_OPACITY, SERIF, TOKENS, type FalakTokens } from "./tokens";

export const tokensOf = (s: { phase: DisplayState["phase"] }): FalakTokens => TOKENS[s.phase];
export const num: CSSProperties = { fontVariantNumeric: "tabular-nums" };
export const serif: CSSProperties = { fontFamily: SERIF };

/** The full 1920×1080 page in the phase background. */
export function Page({ t, children, style }: { t: FalakTokens; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ position: "relative", width: 1920, height: 1080, overflow: "hidden", fontFamily: FONT, background: t.bg, color: F.text, ...style }}>
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

/** Masjid logo, or the arch mark with a gold dot from designs/G-* if there is none (no tiny text). */
export function Logo({ masjid, size, color = F.text }: { masjid: DisplayState["masjid"]; size: number; color?: string }) {
  const [failed, setFailed] = useState(false);
  if (masjid.logoUrl && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={masjid.logoUrl} alt="" onError={() => setFailed(true)} style={{ width: size, height: size, objectFit: "contain", flex: "none" }} />;
  }
  return (
    <svg width={size * 0.85} height={size} viewBox="0 0 40 48" aria-hidden="true" style={{ flex: "none" }}>
      <path d="M6 46V20a14 14 0 0 1 28 0v26" fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" />
      <circle cx={20} cy={24} r={5} fill={F.gold} />
    </svg>
  );
}

/** "Asar dalam" / "2 jam 51 minit", or "Asar seterusnya" when the time is unknown. */
export const nextLine = (s: DisplayState) => (s.countdownText ? `${s.next.label} dalam ${s.countdownText}` : `${s.next.label} seterusnya`);

/** Row look (contract §6, rule 2): current = cream pill, name 600 / time 700; markers fade to 0.74. */
export function rowLook(w: WaktuView) {
  const cur = w.state === "current";
  return {
    background: cur ? F.pill : "transparent",
    color: cur ? F.pillInk : F.text,
    opacity: !cur && w.isMarker ? MARKER_OPACITY : 1,
    nameWeight: cur ? 600 : 500,
    timeWeight: cur ? 700 : 500,
  };
}

/** Where a template is drawn: wide (12:5 bottom) or tall (5:4 side, and the 16:9 poster scaled up). */
export type Area = "wide" | "tall";
export const AreaContext = createContext<Area>("wide");
export const useArea = () => useContext(AreaContext);

// ------------------------------------------------------------------ the dial
// SVG user space as in designs/G-*: viewBox -30 -30 460 460, centre 200,200, rim r=165, plate r=148.
const C = 200;
const R = 165;
const RIM = 2 * Math.PI * R;
const TICKS = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
/** Waktu marked on the face (Imsak is too close to Subuh to mark). */
const MARKED: WaktuView["key"][] = ["subuh", "syuruk", "zohor", "asar", "maghrib", "isyak"];

const polar = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return { x: C + r * Math.sin(a), y: C - r * Math.cos(a) };
};

/**
 * Analogue clock face (contract §6): hands from s.now (they step once a second, no transitions),
 * the digital time in a small window below the pivot, a gold rim arc from the current waktu to now,
 * and a dot for each waktu in the next 12 hours (the current one larger). Labels only when large
 * enough to stay ≥ 18 px.
 */
export function Dial({ s, size, labels = false }: { s: DisplayState; size: number; labels?: boolean }) {
  const t = tokensOf(s);
  const nowMs = s.now.getTime();
  const unit = size / 460; // px per SVG unit
  const hands = handAngles(nowMs);
  const cur = s.current;
  const sweep = cur ? dialSweep(cur.at, nowMs) : 0;
  const winFont = Math.max(24, 20 / unit); // digital time ≥ 20 px on screen
  const labelFont = 17;
  const showLabels = labels && labelFont * unit >= 18;
  const marks = s.waktu.filter((w) => MARKED.includes(w.key) && Number.isFinite(w.at) && (w.state === "current" || withinNextHours(w.at, nowMs)));
  const strong = size >= 600 ? 1 : 1.25; // thicker lines on small dials (designs G-Bottom / G-Side)

  return (
    <svg data-dial viewBox="-30 -30 460 460" width={size} height={size} role="img" aria-label={`Jam ${s.clock}`} style={{ flex: "none", display: "block" }}>
      <circle cx={C} cy={C} r={R} fill="none" stroke={F.rim} strokeWidth={14} />
      {sweep > 0 && (
        <circle
          data-dial-arc
          cx={C}
          cy={C}
          r={R}
          fill="none"
          stroke={F.gold}
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={`${((RIM * Math.min(sweep, 359.9)) / 360).toFixed(1)} ${RIM.toFixed(1)}`}
          transform={`rotate(${(dialAngle(cur!.at) - 90).toFixed(2)} ${C} ${C})`}
        />
      )}
      <circle cx={C} cy={C} r={148} fill={t.plate} />
      <g stroke={t.ink} strokeLinecap="round">
        {TICKS.map((deg) => (
          <line key={deg} x1={C} y1={62} x2={C} y2={deg % 90 === 0 ? 80 : 78} strokeWidth={(deg % 90 === 0 ? 5 : 2.5) * strong} transform={`rotate(${deg} ${C} ${C})`} />
        ))}
      </g>
      <line x1={C} y1={C} x2={C} y2={120} stroke={t.hand} strokeWidth={9 * strong} strokeLinecap="round" transform={`rotate(${hands.hour.toFixed(2)} ${C} ${C})`} />
      <line x1={C} y1={C} x2={C} y2={84} stroke={t.hand} strokeWidth={5.5 * strong} strokeLinecap="round" transform={`rotate(${hands.minute.toFixed(2)} ${C} ${C})`} />
      <line data-second-hand x1={C} y1={224} x2={C} y2={72} stroke={t.sec} strokeWidth={2.5 * strong} strokeLinecap="round" transform={`rotate(${hands.second} ${C} ${C})`} />
      {/* Digital time window below the pivot, drawn over the hands so it always stays readable. */}
      <rect x={C - winFont * 1.75} y={C + 52} width={winFont * 3.5} height={winFont * 1.5} rx={10} fill={t.plate} />
      <rect x={C - winFont * 1.75} y={C + 52} width={winFont * 3.5} height={winFont * 1.5} rx={10} fill={t.ink} opacity={0.1} />
      <text x={C} y={C + 52 + winFont * 1.08} textAnchor="middle" fontSize={winFont} fontWeight={500} fill={t.ink} style={{ fontFamily: FONT, ...num }}>
        {s.clock}
      </text>
      <circle cx={C} cy={C} r={9} fill={t.sec} />
      <circle cx={C} cy={C} r={3.5} fill={t.plate} />
      {marks.map((w) => {
        const p = polar(dialAngle(w.at), R);
        const current = w.state === "current";
        return <circle key={w.key} data-dial-mark={w.key} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r={current ? 11 : 7} fill={F.gold} stroke={t.bg} strokeWidth={3} />;
      })}
      {showLabels &&
        marks.map((w) => {
          const p = polar(dialAngle(w.at), 200);
          return (
            <text key={w.key} x={p.x.toFixed(1)} y={(p.y + 6).toFixed(1)} textAnchor="middle" fontSize={labelFont} fontWeight={700} fill={F.gold} style={{ fontFamily: FONT }}>
              {w.label}
            </text>
          );
        })}
    </svg>
  );
}

/** The iqamah dial (designs/G-Iqamah): rim drains as time passes; countdown on the plate. */
export function IqamahDial({ s, size, label, countdown }: { s: DisplayState; size: number; label: string; countdown: string }) {
  const t = tokensOf(s);
  const left = 1 - Math.min(1, Math.max(0, s.modeProgress ?? 0));
  return (
    <svg data-dial viewBox="-30 -30 460 460" width={size} height={size} role="img" aria-label={`Iqamah ${countdown}`} style={{ flex: "none", display: "block" }}>
      <circle cx={C} cy={C} r={R} fill="none" stroke={F.rim} strokeWidth={14} />
      {left > 0 && (
        <circle data-dial-arc cx={C} cy={C} r={R} fill="none" stroke={F.gold} strokeWidth={14} strokeLinecap="round" strokeDasharray={`${(RIM * left).toFixed(1)} ${RIM.toFixed(1)}`} transform={`rotate(-90 ${C} ${C})`} />
      )}
      <circle cx={C} cy={C} r={148} fill={t.plate} />
      <g stroke={t.ink} strokeLinecap="round" opacity={0.5}>
        {TICKS.map((deg) => (
          <line key={deg} x1={C} y1={62} x2={C} y2={deg % 90 === 0 ? 80 : 78} strokeWidth={deg % 90 === 0 ? 5 : 2.5} transform={`rotate(${deg} ${C} ${C})`} />
        ))}
      </g>
      <text x={C} y={158} textAnchor="middle" fontSize={16} fontWeight={700} fill={t.iqLabel} style={{ fontFamily: FONT, letterSpacing: "0.18em" }}>
        {label}
      </text>
      <text x={C} y={232} textAnchor="middle" fontSize={86} fontWeight={300} fill={t.ink} style={{ fontFamily: FONT, ...num }}>
        {countdown}
      </text>
      <text x={C} y={262} textAnchor="middle" fontSize={15} fontWeight={500} fill={t.ink} opacity={0.7} style={{ fontFamily: FONT }}>
        minit : saat
      </text>
    </svg>
  );
}

/** Small caps label ("● WAKTU ZOHOR"). */
export function Status({ children, size }: { children: ReactNode; size: number }) {
  return <div style={{ fontSize: size, fontWeight: 700, letterSpacing: "0.16em", color: F.gold, textTransform: "uppercase" }}>{children}</div>;
}

/** The serif used for names and headings. */
export const SERIF_FONT = SERIF;
