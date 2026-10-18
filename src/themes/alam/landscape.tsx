"use client";
// The Alam landscape: sky gradient + one SVG (stars, sun/moon with glow, 3 mountain layers,
// mosque silhouette), all coloured from the phase's scene. Cross-fades over 60 s on a phase change.
import type { PhaseKey } from "@/core";
import { useEffect, useState } from "react";
import { A, PHASE_FADE_MS, SCENE } from "./tokens";

const STARS: [number, number, number][] = [
  [140, 120, 2], [320, 210, 1.5], [520, 90, 2.2], [690, 260, 1.4], [860, 140, 1.8], [1040, 60, 1.5], [1180, 230, 2],
  [1330, 110, 1.6], [1700, 320, 1.8], [1820, 90, 2.2], [420, 330, 1.4], [980, 350, 1.3], [1620, 60, 1.5], [250, 400, 1.2],
];

function Scene({ phase, lite }: { phase: PhaseKey; lite: boolean }) {
  const p = SCENE[phase];
  const glowId = `alam-glow-${phase}`;
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: p.sky }} />
      <svg aria-hidden width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <radialGradient id={glowId}>
            <stop offset="0" stopColor={p.sun} stopOpacity={0.9} />
            <stop offset="0.35" stopColor={p.sun} stopOpacity={0.3} />
            <stop offset="1" stopColor={p.sun} stopOpacity={0} />
          </radialGradient>
        </defs>
        <g fill="#FFFFFF" opacity={p.stars}>
          {STARS.map(([cx, cy, r]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
          ))}
        </g>
        {!lite && <circle data-sun-glow cx={p.sx} cy={p.sy} r={p.glowR} fill={`url(#${glowId})`} />}
        <circle cx={p.sx} cy={p.sy} r={p.sr} fill={p.sun} />
        <g transform="translate(0,-120)">
          <path fill={p.l1} opacity={0.85} d="M0 760 L180 690 L340 730 L520 640 L700 700 L880 620 L1060 690 L1240 610 L1420 680 L1600 630 L1780 690 L1920 650 L1920 1200 L0 1200 Z" />
          <path fill={p.l2} d="M0 840 C200 780 380 800 560 820 S920 760 1120 800 S1500 840 1700 790 S1880 800 1920 810 L1920 1200 L0 1200 Z" />
          <g fill={p.l2} data-mosque>
            <rect x={1380} y={800} width={180} height={140} />
            <path d="M1408 802 A62 62 0 0 1 1532 802 Z" />
            <path d="M1373 812 A22 22 0 0 1 1417 812 Z" />
            <path d="M1523 812 A22 22 0 0 1 1567 812 Z" />
            <rect x={1468} y={712} width={4} height={28} />
            <circle cx={1470} cy={708} r={5} />
            <rect x={1592} y={690} width={20} height={250} />
            <rect x={1586} y={748} width={32} height={8} />
            <path d="M1588 690 L1602 652 L1616 690 Z" />
          </g>
          <path fill={p.l3} d="M0 900 C260 860 520 880 760 900 S1240 940 1500 900 S1800 880 1920 890 L1920 1200 L0 1200 Z" />
        </g>
      </svg>
    </>
  );
}

export interface SceneLayer {
  phase: PhaseKey;
  id: number;
  /** true while this layer fades in over the previous one */
  fading: boolean;
}

/**
 * Layers to draw after the phase becomes `phase`. On a change the new layer fades in over the
 * old one; lite switches instantly. At most two layers at once.
 */
export function nextLayers(layers: SceneLayer[], phase: PhaseKey, lite: boolean): SceneLayer[] {
  const top = layers[layers.length - 1];
  if (top.phase === phase) return layers;
  if (lite) return [{ phase, id: top.id + 1, fading: false }];
  return [{ ...top, fading: false }, { phase, id: top.id + 1, fading: true }];
}

export function Landscape({ phase, lite }: { phase: PhaseKey; lite: boolean }) {
  const [layers, setLayers] = useState<SceneLayer[]>([{ phase, id: 0, fading: false }]);

  useEffect(() => setLayers((ls) => nextLayers(ls, phase, lite)), [phase, lite]);
  useEffect(() => {
    if (layers.length < 2) return;
    const t = setTimeout(() => setLayers((ls) => ls.slice(-1).map((l) => ({ ...l, fading: false }))), PHASE_FADE_MS);
    return () => clearTimeout(t);
  }, [layers]);

  return (
    <>
      <style>{"@keyframes alam-fade{from{opacity:0}to{opacity:1}}"}</style>
      {layers.map((l) => (
        <div
          key={l.id}
          data-scene={l.phase}
          style={{ position: "absolute", inset: 0, animation: l.fading ? `alam-fade ${PHASE_FADE_MS}ms linear both` : undefined }}
        >
          <Scene phase={l.phase} lite={lite} />
        </div>
      ))}
      <div style={{ position: "absolute", inset: 0, background: A.scrim }} />
    </>
  );
}