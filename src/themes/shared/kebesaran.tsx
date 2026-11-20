"use client";
// The hari_kebesaran slide body (PRD enhancements §5.4, contract rule 24), shared by every theme: the
// theme passes its colours, its own eyebrow label and title font, and where it is drawn. Calm and
// respectful: no decoration of its own, no Arabic, no animation (lite needs nothing different).
import type { CSSProperties, ReactNode } from "react";
import type { TemplateLive } from "@/templates";

export interface KebesaranStyle {
  ink: string;
  muted: string;
  /** The big figure and the "jangkaan" border */
  accent: string;
  /** Hairlines between the "next events" rows */
  line: string;
  /** Heading font (e.g. a theme's serif); body text inherits the theme font. */
  titleFont?: string;
  /** Tall areas of a centred theme (Serambi's arch). */
  center?: boolean;
}

export const KEBESARAN_EYEBROW = "Hari Kebesaran Islam";

function Jangkaan({ s }: { s: KebesaranStyle }) {
  return (
    <span data-jangkaan style={{ display: "inline-block", padding: "3px 12px", borderRadius: 999, border: `2px solid ${s.muted}`, color: s.muted, fontSize: 20, fontWeight: 700, letterSpacing: "0.06em", lineHeight: 1.3, whiteSpace: "nowrap" }}>
      jangkaan
    </span>
  );
}

/** "1 Ramadan 1448H · Isnin, 8 Feb 2027" + jangkaan */
function Dates({ live, s, size }: { live: NonNullable<TemplateLive["islamicEvents"]>; s: KebesaranStyle; size: number }) {
  const parts = [live.hijri, live.gregorian].filter(Boolean);
  if (!parts.length && !live.jangkaan) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: s.center ? "center" : "flex-start", columnGap: 16, rowGap: 8, fontSize: size, fontWeight: 600, color: s.muted }}>
      {parts.length > 0 && <span>{parts.join(" · ")}</span>}
      {live.jangkaan && <Jangkaan s={s} />}
    </div>
  );
}

function More({ live, s }: { live: NonNullable<TemplateLive["islamicEvents"]>; s: KebesaranStyle }) {
  if (!live.more.length) return null;
  return (
    <div data-more style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      {live.more.map((m) => (
        <div key={m.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, padding: "12px 0", borderTop: `1.5px solid ${s.line}`, fontSize: 28, fontWeight: 600, color: s.ink }}>
          <span style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.label}</span>
            {m.jangkaan && <Jangkaan s={s} />}
          </span>
          <span style={{ flex: "none", color: s.muted, fontVariantNumeric: "tabular-nums" }}>{m.days}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * area "wide" = the 12:5 bottom card; "tall" = 5:4 side card (also scaled up for the 16:9 poster
 * layout). Missing `live` (admin preview without takwim data) shows only the eyebrow (rule 21).
 */
export function KebesaranBody({ live, s, area, eyebrow }: { live?: TemplateLive["islamicEvents"]; s: KebesaranStyle; area: "wide" | "tall"; eyebrow: ReactNode }) {
  const wide = area === "wide";
  const col: CSSProperties = { display: "flex", flexDirection: "column", height: "100%", minHeight: 0, color: s.ink, gap: wide ? 22 : 26, alignItems: s.center ? "center" : "stretch", textAlign: s.center ? "center" : "left" };
  if (!live) return <div style={col}>{eyebrow}</div>;
  const title = (px: number, extra: CSSProperties = {}) => (
    <div style={{ fontFamily: s.titleFont, fontSize: px, fontWeight: 700, lineHeight: 1.08, letterSpacing: -px / 40, ...extra }}>{live.title}</div>
  );

  // Greeting / Malam ini: a calm centred statement.
  if (live.mode === "greeting" || live.mode === "malamIni") {
    const statement = live.mode === "malamIni" ? (wide ? 110 : 104) : wide ? 92 : 80;
    return (
      <div data-kebesaran={live.mode} style={{ ...col, alignItems: "center", textAlign: "center", justifyContent: "center" }}>
        {eyebrow}
        {title(statement, live.mode === "malamIni" ? { color: s.accent } : {})}
        {live.sub && <div style={{ fontFamily: s.titleFont, fontSize: wide ? 52 : 48, fontWeight: 600, lineHeight: 1.15 }}>{live.sub}</div>}
        <Dates live={live} s={{ ...s, center: true }} size={wide ? 30 : 28} />
        {live.more.length > 0 && (
          <div style={{ width: wide ? "70%" : "100%", marginTop: "auto" }}>
            <More live={live} s={s} />
          </div>
        )}
      </div>
    );
  }

  // Countdown / Ramadan: the big figure, then the event.
  const big = (
    <div data-big style={{ display: "flex", flexDirection: "column", alignItems: s.center || !wide ? "center" : "flex-start", flex: "none" }}>
      <span style={{ fontFamily: s.titleFont, fontSize: live.big && live.big.length > 3 ? (wide ? 140 : 150) : wide ? 200 : 180, fontWeight: 700, lineHeight: 0.95, color: s.accent, fontVariantNumeric: "tabular-nums", letterSpacing: -4 }}>{live.big}</span>
      {live.bigCaption && <span style={{ fontSize: wide ? 34 : 32, fontWeight: 700, color: s.muted, marginTop: 6 }}>{live.bigCaption}</span>}
    </div>
  );
  const details = (
    <div style={{ display: "flex", flexDirection: "column", gap: wide ? 14 : 16, minWidth: 0, alignItems: s.center ? "center" : "stretch" }}>
      {title(wide ? 72 : 60)}
      {live.sub && <div style={{ fontSize: wide ? 34 : 32, fontWeight: 600, color: s.ink }}>{live.sub}</div>}
      <Dates live={live} s={s} size={wide ? 30 : 28} />
    </div>
  );

  if (wide) {
    return (
      <div data-kebesaran={live.mode} style={col}>
        {eyebrow}
        <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0, 1fr)", gap: 64, alignItems: "center", flex: 1, minHeight: 0 }}>
          {big}
          <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
            {details}
            <More live={live} s={s} />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div data-kebesaran={live.mode} style={col}>
      {eyebrow}
      <div style={{ display: "flex", alignItems: "center", gap: 36, justifyContent: s.center ? "center" : "flex-start" }}>{big}</div>
      {details}
      <div style={{ marginTop: "auto", width: "100%" }}>
        <More live={live} s={s} />
      </div>
    </div>
  );
}
