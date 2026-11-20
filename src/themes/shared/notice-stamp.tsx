"use client";
// NoticeStamp + CountdownLine (_specs/01-theme-contract.md rules 22–23): the only way a notice or an
// activity countdown is drawn, shared by every theme. The stamp draws its own opaque plate so its
// contrast does not depend on the theme surface (WCAG AA for every text below, on its own plate). The
// theme passes only the tone of its card, a radius and its text colours for the countdown line.
// No shadow, blur, rotation or animation, so `lite` needs nothing different.
import type { CSSProperties, ReactNode } from "react";
import type { TemplateLive } from "@/templates";

export type StampTone = "light" | "dark";

/** Fixed stamp palettes (contract rule 22: amber family = Tangguh, red family = Batal). */
export const STAMP_COLORS = {
  tangguh: {
    light: { plate: "#FFF7E6", border: "#B45309", badge: "#B45309", badgeInk: "#FFFFFF", ink: "#3D2A0B", muted: "#6B4E1F", strong: "#92400E" },
    dark: { plate: "#2B1D05", border: "#F59E0B", badge: "#F59E0B", badgeInk: "#1F1300", ink: "#FDECC8", muted: "#E5C88F", strong: "#FCD34D" },
  },
  batal: {
    light: { plate: "#FEF2F2", border: "#B91C1C", badge: "#B91C1C", badgeInk: "#FFFFFF", ink: "#3F0D0D", muted: "#7A2E2E", strong: "#991B1B" },
    dark: { plate: "#2B0B0B", border: "#F87171", badge: "#F87171", badgeInk: "#250505", ink: "#FEE2E2", muted: "#F3B4B4", strong: "#FCA5A5" },
  },
} as const;

export const STAMP_WORD = { tangguh: "DITANGGUHKAN", batal: "DIBATALKAN" } as const;
export const NEW_DATE_TBA = "Tarikh baru akan dimaklumkan";

/**
 * The stamp: word badge ("DITANGGUHKAN" ≥ 48 px), the original date/time struck through, the new date
 * (or "Tarikh baru akan dimaklumkan") and the reason. `layout` row = badge beside the lines (12:5),
 * column = badge above them (5:4 and the poster layout, which scales the 5:4 box up).
 */
export function NoticeStamp({
  notice,
  tone,
  layout,
  radius = 24,
  align = "start",
}: {
  notice: NonNullable<TemplateLive["notice"]>;
  tone: StampTone;
  layout: "row" | "column";
  radius?: number;
  align?: "start" | "center";
}) {
  const c = STAMP_COLORS[notice.kind][tone];
  const row = layout === "row";
  const centre = align === "center" && !row;
  return (
    <div
      data-notice-stamp={notice.kind}
      style={{
        display: "flex",
        flexDirection: row ? "row" : "column",
        alignItems: row ? "center" : centre ? "center" : "flex-start",
        textAlign: centre ? "center" : "left",
        gap: row ? 36 : 18,
        padding: row ? "22px 32px" : "26px 30px",
        borderRadius: radius,
        border: `3px solid ${c.border}`,
        background: c.plate,
        color: c.ink,
        width: "100%",
        boxSizing: "border-box",
        flex: "none",
      }}
    >
      <div style={{ flex: "none", padding: "6px 22px", borderRadius: Math.min(radius, 14), background: c.badge, color: c.badgeInk, fontSize: 52, fontWeight: 900, letterSpacing: "0.06em", lineHeight: 1.1 }}>
        {STAMP_WORD[notice.kind]}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
        {notice.originalText && (
          <div style={{ fontSize: 30, fontWeight: 600, color: c.muted }}>
            <s style={{ textDecorationThickness: 3 }}>{notice.originalText}</s>
          </div>
        )}
        {notice.kind === "tangguh" &&
          (notice.newText ? (
            <div style={{ fontSize: 36, fontWeight: 600, lineHeight: 1.2 }}>
              Tarikh baru: <b style={{ fontWeight: 800, color: c.strong }}>{notice.newText}</b>
            </div>
          ) : (
            <div style={{ fontSize: 34, fontWeight: 800, color: c.strong, lineHeight: 1.2 }}>{NEW_DATE_TBA}</div>
          ))}
        {notice.reason && <div style={{ fontSize: 28, fontWeight: 500, lineHeight: 1.3 }}>Sebab: {notice.reason}</div>}
      </div>
    </div>
  );
}

/** Splits `text` around `strong` (first occurrence); the strong part in weight 800. */
function withStrong(text: string, strong: string | undefined, strongStyle: CSSProperties): ReactNode {
  const i = strong ? text.indexOf(strong) : -1;
  if (!strong || i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <b style={strongStyle}>{strong}</b>
      {text.slice(i + strong.length)}
    </>
  );
}

/**
 * The activity countdown line (rule 23): "Lagi 3 hari", "Esok · 8:45 malam", "Bermula dalam 42:15",
 * "Sedang berlangsung". Renders nothing when unset. mm:ss in tabular numerals.
 */
export function CountdownLine({
  countdown,
  color,
  strongColor,
  size = 34,
  style,
}: {
  countdown: TemplateLive["countdown"];
  color: string;
  strongColor: string;
  size?: number;
  style?: CSSProperties;
}) {
  if (!countdown) return null;
  return (
    <div data-countdown={countdown.state} style={{ fontSize: size, fontWeight: 600, color, lineHeight: 1.2, fontVariantNumeric: "tabular-nums", flex: "none", ...style }}>
      {withStrong(countdown.text, countdown.strong, { fontWeight: 800, color: strongColor })}
    </div>
  );
}
