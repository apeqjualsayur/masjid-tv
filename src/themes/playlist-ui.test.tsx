// Counter and cross-fade wrapper in every theme's poster area.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildDisplayState, parseLocalDateTime } from "@/core";
import { CONFIG, dayTimes } from "@/core/__fixtures__/sgr01-2026-10";
import { SAMPLE_POSTER, sampleSlide } from "@/templates";
import { availableThemes, getTheme } from "./registry";
import { ThemeView } from "./ThemeView";

const s = (lite = false) =>
  buildDisplayState({
    at: parseLocalDateTime("2026-10-17T14:30:00")!,
    today: dayTimes(17),
    tomorrowImsak: dayTimes(18).times.imsak,
    tomorrowSubuh: dayTimes(18).times.subuh,
    clock24h: false,
    showArabic: true,
    ticker: [],
    lite,
    masjid: { fullName: "M", shortName: "M" },
    modeConfig: CONFIG,
  });

describe.each(availableThemes())("%s poster area", (id) => {
  const { theme } = getTheme(id);
  const render = (layout: "bottom" | "side" | "full", counter?: { position: number; total: number }, lite = false) =>
    renderToStaticMarkup(<ThemeView theme={theme} s={s(lite)} layout={layout} slide={sampleSlide("kuliah")} slideKey="kuliah-1" counter={counter} />);

  it("shows the 2 / 6 counter in bottom and side", () => {
    for (const layout of ["bottom", "side"] as const) {
      expect(render(layout, { position: 2, total: 6 })).toContain(">2 / 6</div>");
    }
  });

  it("hides the counter for a single slide, and in the full layout", () => {
    expect(render("bottom", { position: 1, total: 1 })).not.toContain("data-counter");
    expect(render("full", { position: 2, total: 6 })).not.toContain("data-counter");
  });

  it("wraps the slide in the cross-fade layer, keyed by slide", () => {
    expect(render("side", { position: 2, total: 6 })).toContain('data-slide="kuliah-1"');
    const poster = renderToStaticMarkup(<ThemeView theme={theme} s={s()} layout="bottom" slide={SAMPLE_POSTER} slideKey="poster-potret" />);
    expect(poster).toContain('data-slide="poster-potret"');
    expect(poster).toContain("object-fit:contain");
  });
});
