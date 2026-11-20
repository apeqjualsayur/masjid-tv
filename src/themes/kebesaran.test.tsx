// hari_kebesaran in every theme and area (PRD enhancements §5.4, contract rule 24).
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildDisplayState, parseLocalDateTime, THEME_IDS, type IslamicEvent, type LayoutKey, type ThemeId } from "@/core";
import { CONFIG, dayTimes } from "@/core/__fixtures__/sgr01-2026-10";
import { withLive, type SlideView } from "@/templates";
import { getTheme } from "./registry";
import { ThemeView } from "./ThemeView";

// TEST DATES ONLY (not the JAKIM takwim)
const EV: IslamicEvent[] = [
  { key: "israk_mikraj", hijriYear: 1448, date: "2027-01-06", status: "rasmi" },
  { key: "nisfu_syaaban", hijriYear: 1448, date: "2027-01-24", status: "rasmi" },
  { key: "awal_ramadan", hijriYear: 1448, date: "2027-02-08", status: "jangkaan" },
  { key: "nuzul_quran", hijriYear: 1448, date: "2027-02-24", status: "jangkaan" },
  { key: "aidilfitri", hijriYear: 1448, date: "2027-03-10", status: "jangkaan" },
  { key: "hari_arafah", hijriYear: 1448, date: "2027-05-16", status: "rasmi" },
  { key: "aidiladha", hijriYear: 1448, date: "2027-05-17", status: "rasmi" },
];

/** The slide as the TV builds it at `when` (Maghrib 19:20 for the eve check). */
const slide = (when: string, maghrib: string | null = null): SlideView =>
  withLive({ kind: "template", template: "hari_kebesaran", fields: {} } as SlideView, parseLocalDateTime(when)!, false, { islamicEvents: EV, maghribTodayMs: maghrib ? parseLocalDateTime(maghrib) : null });

const CASES: Record<string, SlideView> = {
  countdown: slide("2026-12-10T10:00"), // 27 days to Israk dan Mikraj
  esok: slide("2027-05-15T10:00"), // Hari Arafah tomorrow; Hari Raya Aidiladha in the list
  greeting: slide("2027-03-10T08:00"), // Aidilfitri
  malamIni: slide("2027-01-23T19:30", "2027-01-23T19:20"), // Nisfu Syaaban
  ramadan: slide("2027-02-19T10:00"),
};

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
    it(`${layout}: every state renders its own text, no Arabic`, () => {
      const c = text(render(id, layout, CASES.countdown));
      expect(c).toContain("Hari Kebesaran Islam");
      expect(c).toMatch(/\b27\b hari lagi/);
      expect(c).toContain("Israk dan Mikraj");
      expect(c).toContain("27 Rejab 1448H · Rabu, 6 Jan 2027");
      expect(text(render(id, layout, CASES.esok))).toMatch(/Esok.*Hari Arafah.*Hari Raya Aidiladha/);
      const g = render(id, layout, CASES.greeting);
      expect(text(g)).toContain("Selamat Hari Raya Aidilfitri");
      expect(g).toContain("data-jangkaan");
      expect(text(render(id, layout, CASES.malamIni))).toMatch(/Malam ini.*Nisfu Syaaban/);
      expect(text(render(id, layout, CASES.ramadan))).toMatch(/Ramadan · Hari ke-12.*Aidilfitri dalam 19 hari/);
    });
  }

  it("the slide itself never adds Arabic (poster layout: no prayer bar around it)", () => {
    for (const sl of Object.values(CASES)) expect(render(id, "poster", sl)).not.toContain('lang="ar"');
  });

  it("12:5: the big figure ≥ 120 px; next-event rows 28 px (≥ 24); jangkaan 20 px (≥ 18)", () => {
    const html = render(id, "bottom", CASES.countdown);
    const big = /data-big[^>]*><span style="[^"]*font-size:(\d+)px/.exec(html);
    expect(Number(big?.[1])).toBeGreaterThanOrEqual(120);
    expect(/data-more[^>]*><div style="[^"]*font-size:(\d+)px/.exec(html)?.[1]).toBe("28");
    const g = render(id, "bottom", CASES.greeting);
    expect(Number(/data-jangkaan[^>]*font-size:(\d+)px/.exec(g)?.[1])).toBeGreaterThanOrEqual(18);
  });

  it("16:9 poster: the big figure is scaled to ≥ 160 px", () => {
    const html = render(id, "poster", CASES.countdown);
    const k = Number(/data-fit="([\d.]+)"/.exec(html)?.[1] ?? 1);
    const big = Number(/data-big[^>]*><span style="[^"]*font-size:(\d+)px/.exec(html)?.[1]);
    expect(big * k).toBeGreaterThanOrEqual(160);
  });

  it("without takwim data (admin preview) only the eyebrow shows", () => {
    const html = render(id, "bottom", { kind: "template", template: "hari_kebesaran", fields: {} } as SlideView);
    expect(text(html)).toContain("Hari Kebesaran Islam");
    expect(html).not.toContain("data-kebesaran");
  });
});
