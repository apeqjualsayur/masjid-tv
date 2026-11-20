"use client";
// A REAL render of one template in the Tenang theme (template gallery, PRD 70 §3.F): the poster layout
// (16:9, slides only) or the bottom layout (12:5 slide area above the prayer bar). Mounted only when
// scrolled near and drawn once at a fixed time from the bundled prayer data: no network.
import { withLive, type PickerKey, type SlideView } from "@/templates";
import { TvFrame } from "./frames";
import { GALLERY_DATE, GALLERY_EVENTS, GALLERY_FIELDS, GALLERY_ROSTER, KEBESARAN_DATE } from "./gallery-samples";
import { InView, useSnapshot } from "./lazy";
import { TemplateMockup } from "./template-mockups";

const BG = "#121614";
export type RenderLayout = "poster" | "bottom";

function Screen({ k, layout, label, small }: { k: Exclude<PickerKey, "ayat">; layout: RenderLayout; label: string; small?: boolean }) {
  const date = k === "hari_kebesaran" ? KEBESARAN_DATE : GALLERY_DATE;
  // 40 minutes after Zohor: normal mode (the slide area shows), as on a real TV mid-afternoon.
  const snap = useSnapshot("tenang", date, (zohor) => zohor + 40 * 60_000);
  const Layout = snap?.theme.layouts[layout];
  if (!snap || !Layout) return <TvFrame small={small} label={label} shadow="none" stand={false} screenBg={BG} />;
  const s = layout === "poster" ? { ...snap.s, mode: "normal" as const } : snap.s;
  const base = { kind: "template", template: k, fields: GALLERY_FIELDS[k] } as unknown as SlideView;
  const slide = withLive(base, s.now.getTime(), false, { islamicEvents: GALLERY_EVENTS, roster: GALLERY_ROSTER, maghribTodayMs: null });
  return (
    <TvFrame small={small} label={label} shadow="none" stand={false} screenBg={BG}>
      <Layout s={s} slide={slide} slideKey={`gallery-${k}-${layout}`} />
    </TvFrame>
  );
}

/** One render, or (Ayat) the layout thumbnail until the verse list is reviewed. */
export function TemplateRender({ k, layout, label, small }: { k: PickerKey; layout: RenderLayout; label: string; small?: boolean }) {
  if (k === "ayat") return <div className="overflow-hidden rounded-xl border border-lb-line"><TemplateMockup k="ayat" /></div>;
  return (
    <InView placeholder={<TvFrame small={small} label={label} shadow="none" stand={false} screenBg={BG} />}>
      <Screen k={k} layout={layout} label={label} small={small} />
    </InView>
  );
}
