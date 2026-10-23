"use client";
import { getClockOffset, localParts, nowMs } from "@/core";
import { useEffect, useState } from "react";
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

/** Reload the page daily at 03:00 local real time (not sim time). */
export function useDailyReload(): void {
  useEffect(() => {
    const loadedAt = Date.now();
    const id = setInterval(() => {
      const real = Date.now() + getClockOffset();
      const { hour, minute } = localParts(real);
      if (hour === 3 && minute === 0 && Date.now() - loadedAt > 2 * 60_000) window.location.reload();
    }, 20_000);
    return () => clearInterval(id);
  }, []);
}