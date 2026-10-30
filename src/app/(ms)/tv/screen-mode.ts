"use client";
// How the TV page is shown, and whether it should load a new version (full-screen plan, phases 2–4).
//   app    — kiosk browser or installed app: full screen that survives a reload
//   tab    — full screen entered with a key press (Fullscreen API): lost on any reload
//   window — browser bars visible
// The mode is reported to the server on every sync (screens.view_mode, migration 0010).
import { useEffect, useState, useSyncExternalStore } from "react";
import { VERSION_URL, isOutdated, parseLiveVersion } from "@/config/release";
import { APP_VERSION } from "./status";

export type ViewMode = "app" | "tab" | "window";

export function viewMode(): ViewMode {
  if (typeof document === "undefined") return "window";
  if (document.fullscreenElement) return "tab";
  const mm = (q: string) => typeof matchMedia !== "undefined" && matchMedia(q).matches;
  if (mm("(display-mode: fullscreen)") || mm("(display-mode: standalone)")) return "app";
  // A kiosk browser reports "browser" display mode, but its page fills the whole screen.
  const fills = Math.abs(window.innerWidth - screen.width) <= 2 && Math.abs(window.innerHeight - screen.height) <= 2;
  return fills ? "app" : "window";
}

/** The Fullscreen API is available (not on every TV browser). */
export const canGoFullscreen = () => typeof document !== "undefined" && Boolean(document.fullscreenEnabled && document.documentElement.requestFullscreen);

export function useViewMode(): ViewMode {
  const [mode, setMode] = useState<ViewMode>("window");
  useEffect(() => {
    const update = () => setMode(viewMode());
    update();
    document.addEventListener("fullscreenchange", update);
    window.addEventListener("resize", update);
    return () => {
      document.removeEventListener("fullscreenchange", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  return mode;
}

// "Quiet": every mode except normal (pre-azan banner, azan, iqamah, solat, khutbah) — no hints on screen. Set by the display, read by the hint.
let quiet = false;
const listeners = new Set<() => void>();
export function setTvQuiet(v: boolean) {
  if (v === quiet) return;
  quiet = v;
  listeners.forEach((l) => l());
}
export const useTvQuiet = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => quiet,
    () => false,
  );

const CHECK_MS = 30 * 60_000;

/** True when the live site requires a newer TV build than this one (public/version.json, every 30 min). */
export function useUpdateNeeded(): boolean {
  const [needed, setNeeded] = useState(false);
  useEffect(() => {
    let off = false;
    const check = () =>
      fetch(VERSION_URL, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((raw) => {
          const live = parseLiveVersion(raw);
          if (!off && live) setNeeded(isOutdated(APP_VERSION, live.minTvBuild));
        })
        .catch(() => undefined); // offline: try again later
    const first = setTimeout(check, 60_000);
    const id = setInterval(check, CHECK_MS);
    return () => {
      off = true;
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);
  return needed;
}
