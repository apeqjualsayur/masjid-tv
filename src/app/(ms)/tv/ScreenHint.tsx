"use client";
// "Tekan OK untuk skrin penuh" / "Versi baharu tersedia" (full-screen plan, phases 2 and 3b).
// Browsers only enter full screen right after a key press or tap on the device itself, so the TV
// shows a small hint and the next press (remote OK, keyboard, touch) does it. A TV kept full screen
// this way skips its nightly reload (hooks.ts), so when a newer version is required the same press
// reloads instead; after the reload the hint offers full screen again. Hidden from the pre-azan
// banner to the end of solat and khutbah. Not shown in a kiosk browser or installed app (already full screen).
import { useEffect, useRef, useState } from "react";
import { canGoFullscreen, useTvQuiet, useUpdateNeeded, useViewMode } from "./screen-mode";

const IGNORED_KEYS = new Set(["Escape", "Shift", "Control", "Alt", "Meta", "Tab"]);

export function ScreenHint() {
  const mode = useViewMode();
  const quiet = useTvQuiet();
  const update = useUpdateNeeded();
  const [failed, setFailed] = useState(false);
  const [supported, setSupported] = useState(false);
  useEffect(() => setSupported(canGoFullscreen()), []);

  const action: "update" | "fullscreen" | null = update && mode === "tab" ? "update" : mode === "window" && supported && !failed ? "fullscreen" : null;
  const actionRef = useRef(action);
  actionRef.current = action;

  useEffect(() => {
    const act = () => {
      if (actionRef.current === "update") window.location.reload();
      else if (actionRef.current === "fullscreen") document.documentElement.requestFullscreen().catch(() => setFailed(true));
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || IGNORED_KEYS.has(e.key)) return;
      act();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", act);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", act);
    };
  }, []);

  if (!action || quiet) return null;
  return (
    <div
      data-screen-hint={action}
      className="font-jakarta"
      style={{
        // Top centre: free in every theme's layouts (the pre-azan banner uses it, so the hint is quiet then).
        position: "fixed",
        left: "50%",
        top: "2.2vh",
        transform: "translateX(-50%)",
        whiteSpace: "nowrap",
        display: "flex",
        alignItems: "center",
        gap: "0.7vw",
        padding: "0.7vw 1.4vw",
        borderRadius: 999,
        background: "rgba(0,0,0,0.72)",
        color: "#FFFFFF",
        fontSize: "max(14px, 1.35vw)",
        fontWeight: 600,
        pointerEvents: "none",
        zIndex: 50,
      }}
    >
      <span style={{ padding: "0.15vw 0.6vw", borderRadius: 6, background: "#FFFFFF", color: "#000000", fontWeight: 800 }}>OK</span>
      {action === "update" ? "Versi baharu tersedia · tekan OK untuk kemas kini" : "Tekan OK untuk skrin penuh"}
    </div>
  );
}
