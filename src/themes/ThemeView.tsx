// Picks what to show from the DisplayState: azan/iqamah/solat/khutbah take over the full
// screen regardless of layout (PRD section 5); otherwise the layout, plus the pre-azan banner.
import type { DisplayState, LayoutKey } from "@/core";
import type { LayoutProps, SlideView, ThemeDefinition, UnavailableState } from "./types";

export function ThemeView({ theme, s, layout, slide, slideKey, counter }: { theme: ThemeDefinition; s: DisplayState; layout: LayoutKey; slide?: SlideView; slideKey?: string; counter?: LayoutProps["counter"] }) {
  const sc = theme.screens;
  switch (s.mode) {
    case "azan":
      return <sc.azan s={s} />;
    case "iqamah":
      return <sc.iqamah s={s} />;
    case "solat":
      return <sc.solat s={s} />;
    case "khutbah":
      return <sc.khutbah s={s} />;
  }
  const Layout = theme.layouts[layout];
  return (
    <>
      <Layout s={s} slide={slide} slideKey={slideKey} counter={counter} />
      {s.mode === "pre_azan" && <sc.preAzanBanner s={s} />}
    </>
  );
}

export function UnavailableView({ theme, u }: { theme: ThemeDefinition; u: UnavailableState }) {
  const U = theme.screens.unavailable;
  return <U u={u} />;
}
