"use client";
// Mini preview of a screen (designs/admin/Screens): the REAL theme layout, the same component the TV
// draws, on a 1920×1080 stage scaled down to the thumbnail. To keep a page of thumbnails cheap:
// - it mounts only while on screen (IntersectionObserver), and unmounts again when scrolled away;
// - the theme's code is loaded on demand (the lazy chunk the TV uses, @/themes loadTheme);
// - the clock is frozen: one fixed DisplayState (Thursday 2:30 pm, Zohor), never re-rendered per tick.
// A poster screen ("Pengumuman sahaja") therefore shows its slide-only look.
import { useEffect, useRef, useState } from "react";
import { buildDisplayState, localToEpoch, type DisplayState, type LayoutKey, type ThemeId } from "@/core";
import { sampleSlide } from "@/templates";
import { loadTheme } from "@/themes";
import type { ThemeDefinition } from "@/themes/types";
import { readDurations, readIqamah } from "../settings/logic";

const at = (h: number, m: number) => localToEpoch(2026, 10, 29, h, m);
const DAY = {
  date: "2026-10-29",
  hijri: "1448-05-18",
  times: { imsak: at(5, 38), subuh: at(5, 48), syuruk: at(6, 55), zohor: at(13, 0), asar: at(16, 19), maghrib: at(18, 59), isyak: at(20, 9) },
};
const SLIDE = sampleSlide("pengumuman");
const frozen = new Map<LayoutKey, DisplayState>();

/** One fixed state per layout (the poster layout gets mode `normal`, like the TV). */
function frozenState(layout: LayoutKey): DisplayState {
  let s = frozen.get(layout);
  if (!s) {
    s = buildDisplayState({
      at: at(14, 30),
      today: DAY,
      tomorrowImsak: DAY.times.imsak + 86_400_000,
      tomorrowSubuh: DAY.times.subuh + 86_400_000,
      clock24h: false,
      showArabic: true,
      ticker: [],
      lite: true, // no blur or glow at thumbnail size
      masjid: { fullName: "Masjid", shortName: "M" },
      modeConfig: { durations: readDurations(undefined), iqamahMin: readIqamah(undefined) },
      layout,
    });
    frozen.set(layout, s);
  }
  return s;
}

/** True while the element is in (or near) the viewport. */
function useVisible<T extends Element>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return setVisible(true);
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "120px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, visible };
}

/** The theme definition once its chunk has loaded (null until then, or if loading failed). */
function useThemeDef(theme: ThemeId, enabled: boolean): ThemeDefinition | null {
  const [def, setDef] = useState<ThemeDefinition | null>(null);
  useEffect(() => {
    if (!enabled || def?.id === theme) return;
    let off = false;
    loadTheme(theme).then(
      (d) => !off && setDef(d),
      () => {},
    );
    return () => {
      off = true;
    };
  }, [theme, enabled, def?.id]);
  return def?.id === theme ? def : null;
}

export function ThemeThumb({ theme, layout = "full", width = 112 }: { theme: ThemeId; layout?: LayoutKey; width?: number }) {
  const h = Math.round((width * 9) / 16);
  const { ref, visible } = useVisible<HTMLDivElement>();
  const def = useThemeDef(theme, visible);
  const Layout = def?.layouts[layout];
  const inner = width - 6; // 3 px frame each side
  return (
    <div ref={ref} aria-hidden="true" data-thumb={`${theme}-${layout}`} style={{ width, height: h }} className="relative flex-none overflow-hidden rounded-lg border-[3px] border-[#1B1B1B] bg-[#2A3330]">
      {visible && Layout && (
        <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transform: `scale(${inner / 1920})`, transformOrigin: "0 0", pointerEvents: "none" }}>
          <Layout s={frozenState(layout)} slide={SLIDE} slideKey="thumb" />
        </div>
      )}
    </div>
  );
}
