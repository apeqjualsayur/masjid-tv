"use client";
// Fixed 1920x1080 stage, scaled to fit any screen and letterboxed in black (PRD section 11),
// with burn-in shift every 10 minutes. Themes lay out in stage px.
import { useEffect, useState, type ReactNode } from "react";
import { burnInOffset } from "./burn-in";

export const STAGE_W = 1920;
export const STAGE_H = 1080;

export function Stage({ children }: { children: ReactNode }) {
  const [box, setBox] = useState({ scale: 1, left: 0, top: 0 });
  const [shift, setShift] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const fit = () => {
      const scale = Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
      setBox({ scale, left: (window.innerWidth - STAGE_W * scale) / 2, top: (window.innerHeight - STAGE_H * scale) / 2 });
    };
    const move = () => setShift(burnInOffset(Date.now()));
    fit();
    move();
    window.addEventListener("resize", fit);
    const id = setInterval(move, 30_000); // picks up each new 10-minute slot within 30 s
    return () => {
      window.removeEventListener("resize", fit);
      clearInterval(id);
    };
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", overflow: "hidden" }}>
      <div
        data-stage
        style={{
          position: "absolute",
          left: box.left,
          top: box.top,
          width: STAGE_W,
          height: STAGE_H,
          overflow: "hidden",
          transformOrigin: "0 0",
          transform: `scale(${box.scale}) translate(${shift.x}px, ${shift.y}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}