"use client";
// The Garis Masa bar (designs/I-*): horizontal (full, bottom) and vertical (side). Positions come from
// ./geometry; states (current/past) from the engine; colours from ./tokens.
import type { DisplayState, WaktuView } from "@/core";
import { LABEL_KEYS, labelAlign, labelRows, nowMarker, segments, spreadLabels, timelineWindow, timesOf, toPx, type Segment, type Window } from "./geometry";
import { num } from "./parts";
import { G, OPACITY, SEG, accentOf } from "./tokens";

type Look = { opacity: number; glow: boolean };

/** Past (ends before now) 0.42 · current waktu 1 + glow · the segment now is in 1 · upcoming 0.72. */
function look(seg: Segment, w: WaktuView | undefined, nowPos: number): Look {
  if (w?.state === "current") return { opacity: OPACITY.current, glow: true };
  if (nowPos >= seg.start + seg.size) return { opacity: OPACITY.past, glow: false };
  if (nowPos >= seg.start) return { opacity: OPACITY.current, glow: false };
  return { opacity: OPACITY.upcoming, glow: false };
}

function useBar(s: DisplayState, length: number) {
  const times = timesOf(s.waktu);
  const win = timelineWindow(times);
  if (!win) return null;
  const byKey = Object.fromEntries(s.waktu.map((w) => [w.key, w])) as Record<WaktuView["key"], WaktuView>;
  const segs = segments(times, win, length);
  const now = nowMarker(s.now.getTime(), win, length);
  return { win, byKey, segs, now, times };
}

/** White chip with the time, kept inside the bar at the ends. */
function NowChip({ s, pos, length, size, vertical }: { s: DisplayState; pos: number; length: number; size: number; vertical?: boolean }) {
  const shift = pos < 70 ? "0%" : pos > length - 70 ? "-100%" : "-50%";
  return (
    <div
      data-now-chip
      style={{
        position: "absolute",
        ...(vertical ? { right: 0, top: pos, transform: `translateY(${shift})` } : { left: pos, top: 0, transform: `translateX(${shift})` }),
        padding: `${Math.round(size * 0.25)}px ${Math.round(size * 0.55)}px`,
        borderRadius: Math.round(size * 0.5),
        background: G.now,
        color: G.nowInk,
        fontSize: size,
        fontWeight: 700,
        lineHeight: 1,
        whiteSpace: "nowrap",
        ...num,
      }}
    >
      {s.clock}
    </div>
  );
}

export interface HorizontalProps {
  s: DisplayState;
  length: number;
  bar: number;
  chip: number;
  /** label sizes; `inline` = name and time on one line (bottom bar) */
  name: number;
  time: number;
  inline?: boolean;
  segFont: number;
  minGap?: number;
}

export function HorizontalTimeline({ s, length, bar, chip, name, time, inline = false, segFont, minGap }: HorizontalProps) {
  const b = useBar(s, length);
  if (!b) return null;
  const chipRow = Math.round(chip * 1.7);
  const rowH = inline ? Math.round(time * 1.1) : Math.round(name * 1.3 + time * 1.12);
  const labelW = inline ? Math.round(name * 4.4 + time * 2.4) : Math.round(Math.max(name * 4.4, time * 2.3) + 15);
  const gap = minGap ?? Math.max(140, labelW + 12);
  const labelKeys = LABEL_KEYS.filter((k) => Number.isFinite(b.times[k]));
  const positions = labelKeys.map((k) => toPx(b.times[k], b.win as Window, length));
  const rows = labelRows(positions, gap);
  const a = accentOf(s.phase);
  return (
    <div data-timeline style={{ position: "relative", width: length }}>
      <div style={{ position: "relative", height: chipRow }}>
        <NowChip s={s} pos={b.now.pos} length={length} size={chip} />
      </div>
      <div style={{ position: "relative", height: bar }}>
        {b.segs.map((seg) => {
          const w = b.byKey[seg.key];
          const l = look(seg, w, b.now.pos);
          const neutral = seg.key === "syuruk";
          return (
            <div
              key={seg.key}
              data-seg={seg.key}
              style={{
                position: "absolute",
                left: seg.start,
                top: 0,
                width: seg.size,
                height: bar,
                boxSizing: "border-box",
                borderRadius: Math.round(bar * 0.16),
                background: SEG[seg.key],
                opacity: l.opacity,
                boxShadow: l.glow && !s.lite ? `0 0 42px ${SEG[seg.key]}` : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: neutral ? G.neutralInk : G.segInk,
                fontSize: segFont,
                fontWeight: 700,
                overflow: "hidden",
                whiteSpace: "nowrap",
              }}
            >
              {seg.key !== "imsak" && w && seg.size >= w.label.length * segFont * 0.6 + 16 ? w.label : ""}
            </div>
          );
        })}
        <div data-now-line style={{ position: "absolute", left: b.now.pos, top: -12, width: 6, height: bar + 24, marginLeft: -3, borderRadius: 3, background: G.now }} />
      </div>
      <div style={{ position: "relative", height: rowH * 2 + 8, marginTop: 14 }}>
        {labelKeys.map((k, i) => {
          const w = b.byKey[k];
          const cur = w.state === "current";
          const end = labelAlign(positions[i], labelW, length) === "end";
          return (
            <div
              key={k}
              data-label={k}
              data-row={rows[i]}
              style={{
                position: "absolute",
                ...(end ? { right: length - positions[i] } : { left: positions[i] }),
                top: rows[i] * (rowH + 8),
                display: "flex",
                flexDirection: inline ? "row" : "column",
                alignItems: inline ? "baseline" : end ? "flex-end" : "flex-start",
                gap: inline ? 10 : 0,
                padding: end ? "0 12px 0 0" : "0 0 0 12px",
                borderLeft: end ? "none" : `3px solid ${G.labelRule}`,
                borderRight: end ? `3px solid ${G.labelRule}` : "none",
                color: cur ? a : G.text,
                whiteSpace: "nowrap",
              }}
            >
              <div style={{ fontSize: name, fontWeight: cur ? 700 : 500, opacity: cur ? 1 : 0.85 }}>{w.label}</div>
              <div style={{ fontSize: time, fontWeight: cur ? 700 : 500, lineHeight: 1.1, ...num }}>{w.time}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Side layout: the bar runs top → bottom; labels pushed apart (≥ 64 px) with a leader line to their point. */
export function VerticalTimeline({ s, length, width = 39 }: { s: DisplayState; length: number; width?: number }) {
  const b = useBar(s, length);
  if (!b) return null;
  const a = accentOf(s.phase);
  const labelKeys = LABEL_KEYS.filter((k) => Number.isFinite(b.times[k]));
  const anchors = labelKeys.map((k) => toPx(b.times[k], b.win, length));
  const ROW = 64;
  const ys = spreadLabels(anchors.map((y) => y - ROW / 2), ROW, length);
  const labelX = width + 54;
  return (
    <div data-timeline style={{ position: "relative", width: "100%", height: length }}>
      {b.segs.map((seg) => {
        const l = look(seg, b.byKey[seg.key], b.now.pos);
        return (
          <div
            key={seg.key}
            data-seg={seg.key}
            style={{ position: "absolute", left: 0, top: seg.start, width, height: seg.size, borderRadius: 12, background: SEG[seg.key], opacity: l.opacity, boxShadow: l.glow && !s.lite ? `0 0 33px ${SEG[seg.key]}` : "none" }}
          />
        );
      })}
      <svg width={labelX} height={length} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} aria-hidden="true">
        {labelKeys.map((k, i) => (
          <polyline key={k} points={`${width + 6},${anchors[i]} ${width + 30},${anchors[i]} ${labelX - 8},${ys[i] + ROW / 2}`} fill="none" stroke={G.labelRule} strokeWidth={2} />
        ))}
      </svg>
      {labelKeys.map((k, i) => {
        const w = b.byKey[k];
        const cur = w.state === "current";
        return (
          <div key={k} data-label={k} style={{ position: "absolute", left: labelX, top: ys[i], height: ROW, display: "flex", alignItems: "center", gap: 14, color: cur ? a : G.text, whiteSpace: "nowrap" }}>
            <div style={{ width: 128, fontSize: 25.5, fontWeight: cur ? 700 : 500, opacity: cur ? 1 : 0.88 }}>{w.label}</div>
            <div style={{ fontSize: 54, fontWeight: cur ? 700 : 500, lineHeight: 1, ...num }}>{w.time}</div>
          </div>
        );
      })}
      <div data-now-line style={{ position: "absolute", left: -9, right: 0, top: b.now.pos, height: 4, marginTop: -2, borderRadius: 2, background: G.now }} />
      <NowChip s={s} pos={b.now.pos} length={length} size={27} vertical />
    </div>
  );
}
