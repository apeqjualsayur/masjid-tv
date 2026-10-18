"use client";
// Cross-fade between slides (600 ms): the outgoing slide (frozen) fades out underneath while the
// new one fades in over it. Lite mode: instant switch. Shared by all themes (no styling of its own).
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

export const SLIDE_FADE_MS = 600;
const layer: CSSProperties = { position: "absolute", inset: 0 };

export function CrossFade({ id, lite, children }: { id: string; lite: boolean; children: ReactNode }) {
  const last = useRef<{ id: string; node: ReactNode }>({ id, node: children });
  const [shownId, setShownId] = useState(id);
  const [outgoing, setOutgoing] = useState<{ id: string; node: ReactNode } | null>(null);

  // A new slide: keep the previous render of the old one underneath (render-phase state update).
  if (shownId !== id) {
    setShownId(id);
    setOutgoing(lite ? null : { id: shownId, node: last.current.node });
  }

  useEffect(() => {
    last.current = { id, node: children };
  });
  useEffect(() => {
    if (!outgoing) return;
    const t = setTimeout(() => setOutgoing(null), SLIDE_FADE_MS);
    return () => clearTimeout(t);
  }, [outgoing]);

  return (
    <>
      <style>{"@keyframes slide-fade{from{opacity:0}to{opacity:1}}@keyframes slide-fade-out{from{opacity:1}to{opacity:0}}"}</style>
      {outgoing && (
        <div key={`out-${outgoing.id}`} data-outgoing style={{ ...layer, animation: `slide-fade-out ${SLIDE_FADE_MS}ms ease both` }} aria-hidden>
          {outgoing.node}
        </div>
      )}
      <div key={id} data-slide={id} style={{ ...layer, animation: outgoing ? `slide-fade ${SLIDE_FADE_MS}ms ease both` : undefined }}>
        {children}
      </div>
    </>
  );
}