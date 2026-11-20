// jadual_petugas in every theme and area (PRD enhancements §6.4, contract rule 25).
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildDisplayState, parseLocalDateTime, THEME_IDS, type LayoutKey, type ThemeId } from "@/core";
import { CONFIG, dayTimes } from "@/core/__fixtures__/sgr01-2026-10";
import { SAMPLE_ROSTER, withLive, type SlideView } from "@/templates";
import { getTheme } from "./registry";
import { ThemeView } from "./ThemeView";

/** The slide as the TV builds it at `when`. 2026-11-20 is a Friday, 2026-11-18 a Wednesday. */
const slide = (view: "minggu" | "hari_ini", when: string): SlideView =>
  withLive({ kind: "template", template: "jadual_petugas", fields: { view } } as SlideView, parseLocalDateTime(when)!, false, { roster: SAMPLE_ROSTER });

const state = (layout: LayoutKey) =>
  buildDisplayState({
    at: parseLocalDateTime("2026-10-17T10:00:00")!,
    today: dayTimes(17),
    tomorrowImsak: dayTimes(18).times.imsak,
    tomorrowSubuh: dayTimes(18).times.subuh,
    clock24h: false,
    showArabic: true,
    ticker: [],
    lite: false,
    masjid: { fullName: "Masjid Al-Hidayah Taman Contoh", shortName: "Al-Hidayah" },
    modeConfig: CONFIG,
    layout,
  });
const render = (id: ThemeId, layout: LayoutKey, sl: SlideView) =>
  renderToStaticMarkup(<ThemeView theme={getTheme(id).theme} s={state(layout)} layout={layout} slide={sl} slideKey="k" />);
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe.each(THEME_IDS)("%s", (id) => {
  for (const layout of ["bottom", "side", "poster"] as const) {
    it(`${layout}: the week, today marked, per-waktu marker`, () => {
      const html = render(id, layout, slide("minggu", "2026-11-20T10:00"));
      const t = text(html);
      expect(t).toContain("Jadual Imam &amp; Bilal");
      expect(t).toMatch(/Isnin.*Selasa.*Rabu.*Khamis.*Jumaat.*Sabtu.*Ahad/);
      expect(t).toContain("Ust. Ahmad Zaki");
      expect(t).toContain("Tuan Hj. Mohd Khairul Anuar bin Abdul Rahman");
      expect(html.match(/data-today=""/g)).toHaveLength(1);
      expect(html.match(/data-per-waktu/g)).toHaveLength(2); // Khamis (Isyak) and Jumaat (Zohor)
    });

    it(`${layout}: today on a Friday shows Jumaat for Zohor and tomorrow`, () => {
      const t = text(render(id, layout, slide("hari_ini", "2026-11-20T10:00")));
      expect(t).toContain("Hari ini · Jumaat");
      // The table only (the prayer bar around the slide has its own Zohor).
      const table = /Waktu Imam Bilal (.*?) Esok:/.exec(t)?.[1] ?? "";
      expect(table).toMatch(/^Subuh .* Jumaat .* Asar .* Maghrib .* Isyak /);
      expect(table).not.toContain("Zohor");
      expect(t).toContain("Hj. Hafiz Rahman");
      expect(t).toContain("Esok: Imam Hj. Hafiz Rahman · Bilal Rahim Osman");
    });
  }

  it("12:5: today's row is bold and filled (not colour alone); names start ≥ 18 px; marker ≥ 18 px", () => {
    const html = render(id, "bottom", slide("minggu", "2026-11-20T10:00"));
    const today = /data-today=""[^>]*><div role="cell" style="([^"]*)"/.exec(html)?.[1] ?? "";
    expect(today).toContain("font-weight:800");
    expect(today).toMatch(/background:(?!transparent)/);
    for (const m of html.matchAll(/data-fit-text[^>]*font-size:(\d+)px/g)) expect(Number(m[1])).toBeGreaterThanOrEqual(18);
    for (const m of html.matchAll(/data-per-waktu[^>]*font-size:(\d+)px/g)) expect(Number(m[1])).toBeGreaterThanOrEqual(18);
  });

  it("without roster data (admin preview) only the eyebrow shows", () => {
    const html = render(id, "bottom", { kind: "template", template: "jadual_petugas", fields: { view: "minggu" } } as SlideView);
    expect(text(html)).toContain("Imam &amp; Bilal");
    expect(html).not.toContain("data-roster");
  });
});
