"use client";
// Service worker registration and browser status for the debug overlay.
import { useEffect, useState } from "react";

export type SwState = "aktif" | "memasang" | "tiada" | "dev" | "ralat";

/** Registers /sw.js in production builds (never in `next dev`). Returns its state and cache version. */
export function useServiceWorker(): { state: SwState; version: string | null } {
  const [state, setState] = useState<SwState>("tiada");
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return setState("dev");
    if (!("serviceWorker" in navigator)) return setState("tiada");
    const sw = navigator.serviceWorker;
    const ask = () => sw.controller?.postMessage("version");
    const onMessage = (e: MessageEvent) => e.data?.type === "version" && setVersion(String(e.data.version));
    const onController = () => {
      setState("aktif");
      ask();
    };
    sw.addEventListener("message", onMessage);
    sw.addEventListener("controllerchange", onController);
    setState(sw.controller ? "aktif" : "memasang");
    ask();
    sw.register("/sw.js").catch((e) => {
      console.warn("[masjid-tv] service worker registration failed", e);
      setState("ralat");
    });
    return () => {
      sw.removeEventListener("message", onMessage);
      sw.removeEventListener("controllerchange", onController);
    };
  }, []);

  return { state, version };
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";