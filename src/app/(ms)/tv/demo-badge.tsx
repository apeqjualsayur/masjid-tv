"use client";
// "DEMO · masjidview.my" (PRD §6): small, bottom-right of the 1920×1080 stage, 60% opacity, in the
// text colour of whatever the theme is showing, so a screenshot is never mistaken for a real masjid.
import { useLayoutEffect, useRef, useState } from "react";

export function DemoBadge({ watch }: { watch: unknown }) {
  const ref = useRef<HTMLDivElement>(null);
  const [color, setColor] = useState("#ffffff");
  // The theme screen is the badge's previous sibling; its root sets the text colour per theme/phase.
  useLayoutEffect(() => {
    const screen = ref.current?.parentElement?.firstElementChild as HTMLElement | null;
    if (screen && screen !== ref.current) setColor(getComputedStyle(screen).color);
  }, [watch]);
  return (
    <div
      ref={ref}
      data-demo-badge
      aria-hidden="true"
      style={{ position: "absolute", right: 28, bottom: 18, zIndex: 50, opacity: 0.6, color, fontFamily: "var(--font-plus-jakarta-sans), sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: "0.08em", pointerEvents: "none" }}
    >
      DEMO · masjidview.my
    </div>
  );
}