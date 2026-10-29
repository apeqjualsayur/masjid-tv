// Announcement-only `poster` layout (contract rules 14–18, PRD round 2 §4) for Tenang, Serambi, Alam.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildDisplayState, parseLocalDateTime, playlistAt, type DisplayInputs } from "@/core";
import { CONFIG, dayTimes } from "@/core/__fixtures__/sgr01-2026-10";
import { SAMPLE_POSTER, SAMPLE_POSTER_LANDSCAPE, TEMPLATE_KEYS, sampleSlide, type SlideView } from "@/templates";
import { getTheme } from "./registry";
import { EMPTY_TEXT, POSTER_STAGE, fitScale } from "./shared/poster";
import { ThemeView } from "./ThemeView";

const state = (when: string, extra: Partial<DisplayInputs> = {}) =>
  buildDisplayState({
    at: parseLocalDateTime(when)!,
    today: dayTimes(17),
    tomorrowImsak: dayTimes(18).times.imsak,
    tomorrowSubuh: dayTimes(18).times.subuh,
    clock24h: false,
    showArabic: true,
    ticker: ["Kuliah malam ini"],
    lite: false,
    masjid: { fullName: "Masjid Al-Hidayah Taman Contoh", shortName: "Al-Hidayah" },
    modeConfig: CONFIG,
    layout: "poster",
    ...extra,
  });
const THEMES = ["tenang", "serambi", "alam"] as const;
const render = (id: (typeof THEMES)[number], s: ReturnType<typeof state>, slide?: SlideView, counter?: { position: number; total: number }) =>
  renderToStaticMarkup(<ThemeView theme={getTheme(id).theme} s={s} layout="poster" slide={slide} slideKey={slide ? "k1" : undefined} counter={counter} />);

/** Everything rule 15 forbids, as it would appear on screen at 13:02 on Sat 17 Oct (Zohor azan). */
const forbidden = (s: ReturnType<typeof state>) => [s.clock, s.gregorian, s.hijri, s.countdownText, "Kuliah malam ini", "SEKARANG", "SETERUSNYA", "Azan", "Iqamah", "Subuh", "Maghrib"];

describe.each(THEMES)("%s poster layout", (id) => {
  it("posterArea.poster is the whole 1920×1080 stage (16:9)", () => {
    expect(getTheme(id).theme.posterArea.poster).toEqual({ x: 0, y: 0, w: 1920, h: 1080 });
    expect(POSTER_STAGE.w / POSTER_STAGE.h).toBeCloseTo(16 / 9);
  });

  it("at azan time: the slide, a brand chip, and nothing about prayer times or modes (rules 14–15)", () => {
    const s = state("2026-10-17T13:02:00");
    expect(s.mode).toBe("normal");
    const out = render(id, s, sampleSlide("pengumuman"), { position: 2, total: 5 });
    expect(out).toContain("data-poster-area");
    expect(out).toContain("data-brand-chip");
    expect(out).toContain("Al-Hidayah");
    expect(out).not.toContain("data-counter");
    expect(out).not.toContain("data-friday");
    for (const word of forbidden(s)) expect(out, word).not.toContain(word);
  });

  it("even a forced iqamah / khutbah state never shows a mode screen", () => {
    const azanState = { ...state("2026-10-17T13:09:00"), mode: "iqamah" as const };
    expect(render(id, azanState, sampleSlide("kuliah"))).toContain("data-poster-area");
    const fri = { ...state("2026-10-16T13:10:00", { today: dayTimes(16), tomorrowImsak: dayTimes(17).times.imsak, tomorrowSubuh: dayTimes(17).times.subuh }), mode: "khutbah" as const };
    const out = render(id, fri, sampleSlide("kuliah"));
    expect(out).not.toMatch(/Khutbah sedang|SOLAT JUMAAT/);
  });

  it("every template renders in the 16:9 area, scaled up (≥ 1) and never below 18 px", () => {
    const s = state("2026-10-17T10:00:00");
    for (const key of TEMPLATE_KEYS) {
      const out = render(id, s, sampleSlide(key));
      const k = Number(/data-fit="([\d.]+)"/.exec(out)?.[1]);
      expect(k, key).toBeGreaterThanOrEqual(1);
      const box = out.slice(out.indexOf("data-fit="), out.indexOf("data-brand-chip")); // the scaled template only
      const sizes = [...box.matchAll(/font-size:\s*([\d.]+)px/g)].map((m) => Number(m[1]));
      expect(sizes.length, key).toBeGreaterThan(0);
      expect(Math.min(...sizes) * k, key).toBeGreaterThanOrEqual(18);
    }
  });

  it("image posters fill the stage: contain + blurred fill; no blur in lite", () => {
    for (const poster of [SAMPLE_POSTER, SAMPLE_POSTER_LANDSCAPE]) {
      const out = render(id, state("2026-10-17T10:00:00"), poster);
      expect(out).toContain("object-fit:contain");
      expect(out).toMatch(/blur\(/);
      expect(render(id, state("2026-10-17T10:00:00", { lite: true }), poster)).not.toMatch(/blur\(/);
    }
  });

  it("empty state: logo, full name and the calm line; no prayer data, no chip (rule 17)", () => {
    const s = state("2026-10-17T13:02:00");
    const out = render(id, s);
    expect(out).toContain("data-empty");
    expect(out).toContain("Masjid Al-Hidayah Taman Contoh");
    expect(out).toContain(EMPTY_TEXT);
    expect(out).not.toContain("data-brand-chip");
    for (const word of forbidden(s)) expect(out, word).not.toContain(word);
  });

  it("kematian stays sober in the 16:9 area (no accent decoration)", () => {
    const out = render(id, state("2026-10-17T10:00:00"), sampleSlide("kematian"));
    expect(out).toContain("data-poster-area");
    if (id === "alam") expect(out).not.toContain("#1F7A55");
    if (id === "serambi") expect(out).not.toContain("#E3B04B");
  });
});

describe("poster playlist", () => {
  it("a single slide stays the same slide (same id), so no transition runs", () => {
    const one = [{ id: "only", payload: sampleSlide("ayat"), durationS: 15 }];
    const ids = [0, 15_000, 31_000, 3_600_000].map((dt) => playlistAt(one as never, parseLocalDateTime("2026-10-17T10:00:00")! + dt)?.item.id);
    expect(new Set(ids)).toEqual(new Set(["only"]));
    expect(playlistAt(one as never, parseLocalDateTime("2026-10-17T10:00:00")!)?.total).toBe(1);
  });

  it("fitScale grows the theme's 5:4 content to fill the height, leaving room for the chip", () => {
    expect(fitScale(1020, 808)).toBeCloseTo(960 / 808); // Tenang
    expect(fitScale(740, 680)).toBeCloseTo(960 / 680); // Serambi
    expect(1920 - 1020 * fitScale(1020, 808)).toBeGreaterThanOrEqual(2 * 340);
  });
});
