"use client";
import type { DisplayState } from "@/core";

/**
 * Poster uncropped (contain) over a blurred, darkened copy of itself (PRD section 6, designs/A-Side).
 * Lite: solid dark fill, no blur.
 */
export function AlamPoster({ s, imageUrl }: { s: DisplayState; imageUrl: string }) {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#0C1A16" }}>
      {!s.lite && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt=""
            aria-hidden
            style={{ position: "absolute", inset: -80, width: "calc(100% + 160px)", height: "calc(100% + 160px)", objectFit: "cover", filter: "blur(70px)", opacity: 0.75 }}
          />
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.22)" }} />
        </>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
    </div>
  );
}