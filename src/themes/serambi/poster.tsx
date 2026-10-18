"use client";
import type { DisplayState } from "@/core";
import { C } from "./tokens";

/** Poster uncropped (contain) over a blurred copy of itself (PRD section 6). Lite: plain background, no blur. */
export function SerambiPoster({ s, imageUrl }: { s: DisplayState; imageUrl: string }) {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: C.bg }}>
      {!s.lite && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          aria-hidden
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(40px) brightness(0.6)", transform: "scale(1.15)" }}
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
    </div>
  );
}