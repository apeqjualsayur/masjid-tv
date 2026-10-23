"use client";
// Hero TV: the REAL Tenang theme, bottom layout, one Kuliah slide, prayer times for WLY01 from the
// bundled year file. Colours follow the current prayer period in Malaysia time (?sim= to test).
// The theme and the data are loaded after the first paint so the H1 stays the LCP element.
import { useEffect, useState } from "react";
import type { PhaseKey } from "@/core";
import type { DayResult, YearFile } from "@/data";
import { TOKENS as TENANG } from "@/themes/tenang/tokens";
import type { ThemeDefinition } from "@/themes/types";
import { TvFrame } from "./frames";
import { heroDateKey, heroDay, heroSlide, heroState, heroTime, simFromSearch } from "./hero-data";

interface Loaded {
  theme: ThemeDefinition;
  file: YearFile;
}

/** Clock: real time, or ?sim= start time moving forward in real time. Null until mounted. */
function useHeroNow(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const sim = simFromSearch(window.location.search);
    const start = Date.now();
    const read = () => (sim === null ? Date.now() : sim + (Date.now() - start));
    let id: ReturnType<typeof setTimeout>;
    const tick = () => {
      setNow(read());
      id = setTimeout(tick, 1000 - (Date.now() % 1000) + 10);
    };
    tick();
    return () => clearTimeout(id);
  }, []);
  return now;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

export function HeroTv({ label, onPhase }: { label: string; onPhase: (phase: PhaseKey, glow: string) => void }) {
  const now = useHeroNow();
  const lite = usePrefersReducedMotion();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [day, setDay] = useState<{ key: string; result: DayResult } | null>(null);

  // After first paint: the theme code and the year file, both bundled with the site (no API call).
  useEffect(() => {
    let off = false;
    const id = requestAnimationFrame(() => {
      Promise.all([import("@/themes/tenang"), import("../../public/data/WLY01-2026.json")]).then(([t, f]) => {
        if (!off) setLoaded({ theme: t.tenang, file: (f.default ?? f) as unknown as YearFile });
      });
    });
    return () => {
      off = true;
      cancelAnimationFrame(id);
    };
  }, []);

  const dateKey = loaded && now !== null ? heroDateKey(now, loaded.file.year) : null;
  useEffect(() => {
    if (!loaded || !dateKey) return;
    let off = false;
    heroDay(loaded.file, dateKey).then((result) => !off && setDay({ key: dateKey, result }));
    return () => {
      off = true;
    };
  }, [loaded, dateKey]);

  const at = loaded && now !== null ? heroTime(now, loaded.file.year) : null;
  const s = day && day.key === dateKey && at !== null ? heroState(day.result, at, lite) : null;
  const phase = s?.phase;

  useEffect(() => {
    if (phase) onPhase(phase, TENANG[phase].glow);
  }, [phase, onPhase]);

  const Bottom = loaded?.theme.layouts.bottom;
  return (
    <TvFrame label={label} screenBg={TENANG[phase ?? "zohor"].bg}>
      {s && Bottom && <Bottom s={s} slide={heroSlide(at!)} slideKey="hero-kuliah" />}
    </TvFrame>
  );
}

