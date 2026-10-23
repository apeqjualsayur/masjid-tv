"use client";
// Below-the-fold theme renders (PRD §9): mounted only when they scroll near the viewport, and drawn
// once at a fixed time (no clock, so nothing re-renders every second, on- or off-screen).
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { DisplayState, ThemeId } from "@/core";
import type { YearFile } from "@/data";
import type { ThemeDefinition } from "@/themes/types";
import { heroDay, heroState } from "./hero-data";

/** Renders children once the placeholder comes within `margin` of the viewport; never unmounts. */
export function InView({ children, placeholder, margin = "300px" }: { children: ReactNode; placeholder?: ReactNode; margin?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (typeof IntersectionObserver === "undefined") return setSeen(true);
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setSeen(true), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [seen, margin]);
  return <div ref={ref}>{seen ? children : placeholder}</div>;
}

// One download per asset for the whole page, shared by every section.
let yearFile: Promise<YearFile> | null = null;
export const loadYearFile = () => (yearFile ??= import("../../public/data/WLY01-2026.json").then((m) => (m.default ?? m) as unknown as YearFile));

const themes: Partial<Record<ThemeId, Promise<ThemeDefinition>>> = {};
export function loadTheme(id: ThemeId): Promise<ThemeDefinition> {
  return (themes[id] ??=
    id === "serambi" ? import("@/themes/serambi").then((m) => m.serambi) : id === "alam" ? import("@/themes/alam").then((m) => m.alam) : import("@/themes/tenang").then((m) => m.tenang));
}

/** Theme + a frozen DisplayState for WLY01 at `at(dayTimes)`; null while loading or without data. */
export function useSnapshot(themeId: ThemeId, dateKey: string, at: (zohor: number, times: Record<string, number>) => number): { theme: ThemeDefinition; s: DisplayState } | null {
  const [v, setV] = useState<{ theme: ThemeDefinition; s: DisplayState } | null>(null);
  const atRef = useRef(at);
  useEffect(() => {
    let off = false;
    Promise.all([loadTheme(themeId), loadYearFile().then((f) => heroDay(f, dateKey))]).then(([theme, day]) => {
      if (off || day.status !== "ok") return;
      const reduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
      const s = heroState(day, atRef.current(day.today.times.zohor, day.today.times), reduced);
      if (s) setV({ theme, s });
    });
    return () => {
      off = true;
    };
  }, [themeId, dateKey]);
  return v;
}