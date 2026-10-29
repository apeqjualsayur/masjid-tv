"use client";
import type { DisplayState } from "@/core";
import { tokensOf } from "./parts";

/** Poster shown uncropped (contain) over a blurred copy of itself (PRD section 6). Lite: plain phase colour, no blur. */
export function FalakPoster({ s, imageUrl }: { s: DisplayState; imageUrl: string }) {
  const t = tokensOf(s);
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: t.bg }}>
      {!s.lite && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(40px) brightness(0.8)", transform: "scale(1.15)" }} />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
    </div>
  );
}
