"use client";
// "Dua TV, dua tugas" (Ciri-ciri, round 2): two small TVs drawn with the REAL Tenang theme, the
// full layout (prayer times) beside the poster layout ("Pengumuman sahaja", slides only). Mounted
// only when scrolled near, drawn once at a fixed time like the other showcase renders.
import type { SlideView } from "@/templates";
import { TvFrame } from "./frames";
import { InView, useSnapshot } from "./lazy";
import { SHOWCASE_DATE } from "./showcase";
import { LANDING_SAMPLES } from "./template-samples";

/** 1:20 pm on the showcase Thursday (normal mode). */
const AT = Date.UTC(2026, 9, 22, 13 - 8, 20);
const SLIDE = { kind: "template", template: "kuliah", fields: LANDING_SAMPLES.kuliah } as SlideView;
const BG = "#121614";

function Tv({ layout, label }: { layout: "full" | "poster"; label: string }) {
  const snap = useSnapshot("tenang", SHOWCASE_DATE, () => AT);
  const Layout = snap?.theme.layouts[layout];
  // The poster layout never shows prayer data or modes (contract rule 15): give it mode normal, as the TV does.
  const s = snap && (layout === "poster" ? { ...snap.s, mode: "normal" as const } : snap.s);
  return (
    <TvFrame small label={label} shadow="none" stand={false} screenBg={BG}>
      {s && Layout && <Layout s={s} slide={SLIDE} slideKey="dual" />}
    </TvFrame>
  );
}

export function DualScreens({ prayer, poster }: { prayer: string; poster: string }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[
        ["full", prayer],
        ["poster", poster],
      ].map(([layout, label]) => (
        <figure key={layout} className="m-0 flex flex-col gap-1.5">
          <InView placeholder={<TvFrame small label={label} shadow="none" stand={false} screenBg={BG} />}>
            <Tv layout={layout as "full" | "poster"} label={label} />
          </InView>
          <figcaption className="text-[13px] font-semibold text-lb-muted">{label}</figcaption>
        </figure>
      ))}
    </div>
  );
}
