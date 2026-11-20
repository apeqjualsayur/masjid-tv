"use client";
// The TV page inside the Android TV app (PRD enhancements §8.2–8.3): which app version runs it, the
// app_version sent with each sync, and the heartbeat the app watches (no beat for 3 min → reload).
import { useEffect } from "react";
import { SHELL_KEY, appVersionWithShell, resolveShell, type ShellInfo } from "@/config/app-shell";
import { APP_VERSION } from "./status";

let cached: ShellInfo | null | undefined;

/** The app shell this page runs in (from ?shell=apk&shellv=…, remembered across reloads), or null. */
export function currentShell(): ShellInfo | null {
  if (cached !== undefined) return cached;
  if (typeof window === "undefined") return null;
  let stored: string | null = null;
  try {
    stored = globalThis.localStorage?.getItem(SHELL_KEY) ?? null;
  } catch {
    // storage blocked: the URL alone decides
  }
  const r = resolveShell(window.location?.search ?? "", stored);
  if (r.store !== undefined) {
    try {
      if (r.store === null) localStorage.removeItem(SHELL_KEY);
      else localStorage.setItem(SHELL_KEY, r.store);
    } catch {
      // not remembered; fine for this load
    }
  }
  cached = r.shell;
  return cached;
}

/** app_version for screen_bundle: "<web build>+apk<app version>" inside the app. */
export const tvAppVersion = (): string => appVersionWithShell(APP_VERSION, currentShell());

interface ShellBridge {
  heartbeat?: () => void;
}

/** Every 30 s tell the app the page is alive. Does nothing in a normal browser. */
export function useShellHeartbeat() {
  useEffect(() => {
    currentShell(); // read ?shell=… and remember it before anything changes the address
    const beat = () => {
      try {
        (window as unknown as { MasjidViewShell?: ShellBridge }).MasjidViewShell?.heartbeat?.();
      } catch {
        // the bridge is gone (page reloading): the next beat retries
      }
    };
    beat();
    const id = setInterval(beat, 30_000);
    return () => clearInterval(id);
  }, []);
}
