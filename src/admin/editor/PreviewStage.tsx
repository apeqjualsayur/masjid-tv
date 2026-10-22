"use client";
// Live preview: the REAL theme layout component (same as the TV) on a 1920×1080 stage scaled to
// the available width, with a DisplayState built from today's real prayer times for the org's zone.
// The layout is rendered directly, so the preview always shows the slide (never an azan screen).
import { useEffect, useRef, useState } from "react";
import { buildDisplayState, type LayoutKey, type ThemeId } from "@/core";
import type { DayResult } from "@/data";
import type { SlideView } from "@/templates";
import { getTheme } from "@/themes/registry";
import type { Durations, IqamahMin } from "../settings/logic";

export interface PreviewTarget {
  key: string;
  label: string;
  theme: ThemeId;
  layout: LayoutKey;
}

export interface PreviewContext {
  masjid: { fullName: string; shortName: string; logoUrl?: string };
  clock24h: boolean;
  showArabic: boolean;
  ticker: string[];
  iqamahMin: IqamahMin;
  durations: Durations;
}

export function PreviewStage({ slide, target, day, now, ctx, label }: { slide: SlideView; target: PreviewTarget; day: DayResult & { status: "ok" }; now: number; ctx: PreviewContext; label: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  const scale = w / 1920;
  const s = buildDisplayState({
    at: now,
    today: day.today,
    tomorrowImsak: day.tomorrowImsak,
    tomorrowSubuh: day.tomorrowSubuh,
    clock24h: ctx.clock24h,
    showArabic: ctx.showArabic,
    ticker: ctx.ticker,
    lite: false,
    masjid: ctx.masjid,
    modeConfig: { durations: ctx.durations, iqamahMin: ctx.iqamahMin },
  });
  const Layout = getTheme(target.theme).theme.layouts[target.layout];
  return (
    <div ref={box} role="img" aria-label={label} className="relative w-full overflow-hidden rounded-[10px] bg-black ring-[6px] ring-[#1B1B1B]" style={{ height: Math.round(1080 * scale) || undefined, aspectRatio: w ? undefined : "16 / 9" }}>
      {w > 0 && (
        <div aria-hidden="true" style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transform: `scale(${scale})`, transformOrigin: "0 0", pointerEvents: "none" }}>
          <Layout s={s} slide={slide} slideKey="preview" />
        </div>
      )}
    </div>
  );
}