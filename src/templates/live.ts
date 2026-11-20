// Attach `live` (contract rule 21) to a template slide: used by the TV for the slide on screen and by
// the admin live preview, so both show the same countdown / notice.
import { templateLive } from "@/core";
import type { SlideView } from "./types";

export function withLive(slide: SlideView, at: number, clock24h: boolean): SlideView {
  if (slide.kind !== "template") return slide;
  const live = templateLive(slide.template, slide.fields as unknown as Record<string, unknown>, at, clock24h);
  return live ? ({ ...slide, live } as SlideView) : slide;
}
