"use client";
import { getClockOffset, localParts, nowMs } from "@/core";
import { useEffect, useRef, useState } from "react";
import { createFrameMonitor } from "./frame-monitor";

/** The app clock (offset + sim/speed), ticking once per (simulated) second. */
export function useNow(speed = 1): number {
  const [t, setT] = useState(() => nowMs());
  useEffect(() => {
    let id: ReturnType<typeof setTimeout>;
    const step = () => {
      const n = nowMs();
      setT(n);
      // Real time: wake just after each second boundary. Sped up: one tick per simulated second.
      const delay = speed > 1 ? Math.max(50, 1000 / speed) : 1000 - (((n % 1000) + 1000) % 1000) + 10;
      id = setTimeout(step, delay);
    };
    step();
    return () => clearTimeout(id);
  }, [speed]);
  return t;
}

/**
 * Automatic lite mode: measure frame time for 10 s (5 s after boot, then every 10 min).
 * Once the device is found slow, lite stays on until reload.
 */
export function useAutoLite(enabled: boolean): boolean {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!enabled || slow) return;
    let raf = 0;
    let timer: ReturnType<typeof setTimeout>;
    const measure = () => {
      const monitor = createFrameMonitor();
      const loop = (ts: number) => {
        const v = monitor.push(ts);
        if (v === "slow") return setSlow(true);
        if (v === "ok") return void (timer = setTimeout(measure, 10 * 60_000));
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    };
    timer = setTimeout(measure, 5_000);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [enabled, slow]);
  return slow;
}

/**
 * Daily restart at 03:00 local real time (not sim time): a page reload, which also loads a new
 * version. A TV kept full screen by a key press would lose full screen on reload (and nobody is there
 * to press OK at 3 am), so it restarts the app in place instead (`onSoftRestart`); it gets a new
 * version from the "Versi baharu" hint or when switched off and on (owner decision, plan 3b).
 */
export function useDailyReload(onSoftRestart: () => void): void {
  const soft = useRef(onSoftRestart);
  soft.current = onSoftRestart;
  useEffect(() => {
    let since = Date.now();
    const id = setInterval(() => {
      const action = dailyRestart(Date.now() + getClockOffset(), Date.now() - since, Boolean(document.fullscreenElement));
      if (action === "soft") {
        since = Date.now();
        soft.current();
      } else if (action === "reload") window.location.reload();
    }, 20_000);
    return () => clearInterval(id);
  }, []);
}

/**
 * What the daily restart does at `realMs` (Malaysia time): nothing outside 03:00–03:00:59 or within
 * 2 min of the last (re)start; a soft restart when kept full screen by a key press; else a reload.
 */
export function dailyRestart(realMs: number, msSinceStart: number, keyFullscreen: boolean): "reload" | "soft" | null {
  const { hour, minute } = localParts(realMs);
  if (hour !== 3 || minute !== 0 || msSinceStart < 2 * 60_000) return null;
  return keyFullscreen ? "soft" : "reload";
}