// Garis Masa (contract §7, PRD round 2 §5): checks that can be made on the rendered HTML.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildDisplayState, parseLocalDateTime, type DisplayInputs, type LayoutKey } from "@/core";
import { CONFIG, dayTimes } from "@/core/__fixtures__/sgr01-2026-10";
import { TEMPLATE_KEYS, sampleSlide } from "@/templates";
import { garis } from "./garis";
import { ThemeView } from "./ThemeView";

const state = (when: string, extra: Partial<DisplayInputs> = {}) =>
  buildDisplayState({
    at: parseLocalDateTime(when)!,
    today: dayTimes(17),
    tomorrowImsak: dayTimes(18).times.imsak,
    tomorrowSubuh: dayTimes(18).times.subuh,
    clock24h: false,
    showArabic: true,
    ticker: [],
    lite: false,
    masjid: { fullName: "Masjid Al-Hidayah", shortName: "AH" },
    modeConfig: CONFIG,
    ...extra,
  });
const friday = (when: string, extra: Partial<DisplayInputs> = {}) =>
  state(when, { today: dayTimes(16), tomorrowImsak: dayTimes(17).times.imsak, tomorrowSubuh: dayTimes(17).times.subuh, ...extra });
const html = (s: ReturnType<typeof state>, layout: LayoutKey = "full", slide = sampleSlide("pengumuman")) =>
  renderToStaticMarkup(<ThemeView theme={garis} s={s} layout={layout} slide={slide} />);
const pxSizes = (out: string) => [...out.matchAll(/font-size:\s*([\d.]+)px/g)].map((m) => Number(m[1]));
const PHASES = ["2026-10-17T06:40:00", "2026-10-17T14:00:00", "2026-10-17T17:00:00", "2026-10-17T19:30:00", "2026-10-17T22:00:00"];

describe("garis", () => {
  it("is registered with every layout and poster boxes of the right ratio", () => {
    expect(garis.id).toBe("garis");
    expect(Object.keys(garis.layouts).sort()).toEqual(["bottom", "full", "poster", "side"]);
    expect(garis.posterArea.bottom.w / garis.posterArea.bottom.h).toBeCloseTo(12 / 5);
    expect(garis.posterArea.side.w / garis.posterArea.side.h).toBeCloseTo(5 / 4);
  });

  it("seven segments; Syuruk–Zohor is one neutral segment labelled Syuruk; Imsak only as a note", () => {
    const out = html(state("2026-10-17T14:00:00"));
    expect([...out.matchAll(/data-seg="(\w+)"/g)].map((m) => m[1])).toEqual(["imsak", "subuh", "syuruk", "zohor", "asar", "maghrib", "isyak"]);
    expect(out).toMatch(/data-seg="syuruk"[^>]*>Syuruk</);
    expect(out).toMatch(/data-seg="imsak"[^>]*><\/div>/);
    expect(out).toContain("Imsak 5:40");
  });

  it("past segments fade to 0.42 (never lower), current is full with a glow, upcoming 0.72", () => {
    const out = html(state("2026-10-17T14:00:00"));
    const op = (k: string) => Number(new RegExp(`data-seg="${k}"[^>]*opacity:([\\d.]+)`).exec(out)?.[1]);
    expect(op("subuh")).toBe(0.42);
    expect(op("zohor")).toBe(1);
    expect(out).toMatch(/data-seg="zohor"[^>]*box-shadow:0 0 42px/);
    expect(op("asar")).toBe(0.72);
    for (const k of ["imsak", "subuh", "syuruk", "zohor", "asar", "maghrib", "isyak"]) expect(op(k)).toBeGreaterThanOrEqual(0.42);
  });

  it("Friday: the Zohor segment and label read Jumaat", () => {
    const out = html(friday("2026-10-16T10:00:00"));
    expect(out).toMatch(/data-seg="zohor"[^>]*>Jumaat</);
    expect(out).toMatch(/data-label="zohor"[\s\S]*?Jumaat/);
  });

  it("labels closer than 140 px drop to the second row (Syuruk, Isyak)", () => {
    const out = html(state("2026-10-17T14:00:00"));
    const rows = Object.fromEntries([...out.matchAll(/data-label="(\w+)" data-row="(\d)"/g)].map((m) => [m[1], Number(m[2])]));
    expect(rows).toEqual({ subuh: 0, syuruk: 1, zohor: 0, asar: 0, maghrib: 0, isyak: 1 });
  });

  it("before Imsak and after the window the now-marker sits at the ends", () => {
    expect(html(state("2026-10-17T04:00:00"))).toMatch(/data-now-line="true" style="position:absolute;left:0;/);
    expect(html(state("2026-10-17T23:30:00"))).toMatch(/data-now-line="true" style="position:absolute;left:1680px/);
  });

  it.each(["full", "bottom", "side"] as const)("%s: text ≥ 18 px; prayer times at the minimum size", (layout) => {
    for (const when of PHASES) {
      const out = html(state(when), layout);
      expect(Math.min(...pxSizes(out))).toBeGreaterThanOrEqual(18);
      const labels = out.split("data-label=").slice(1).map((x) => Number(/font-size:([\d.]+)px;font-weight:\d+;line-height:[\d.]+;font-variant-numeric/.exec(x)?.[1]));
      expect(labels.length, `${when} mode=${state(when).mode}`).toBe(6);
      expect(Math.min(...labels)).toBeGreaterThanOrEqual(layout === "bottom" ? 44 : 54);
    }
  });

  it("side layout uses the vertical timeline", () => {
    const out = html(state("2026-10-17T14:00:00"), "side", sampleSlide("kewangan"));
    expect(out).toMatch(/data-seg="zohor" style="position:absolute;left:0;top:/);
    expect(out).toContain("<polyline");
  });

  it("iqamah: big mm:ss and 10 blocks of 10 % draining (half the time left = 5 full blocks)", () => {
    const out = html(state("2026-10-17T13:09:00")); // Zohor 1:01 + 3 min azan; iqamah 10 min → 5 min left
    expect(out).toContain("05:00");
    const fills = [...out.matchAll(/data-block-fill="([\d.]+)"/g)].map((m) => Number(m[1]));
    expect(fills).toEqual([1, 1, 1, 1, 1, 0, 0, 0, 0, 0]);
  });

  it("mode screens: azan, solat, khutbah, pre-azan banner; Friday strip in every layout", () => {
    expect(html(state("2026-10-17T13:02:00"))).toMatch(/Azan[\s\S]*Zohor/);
    expect(html(state("2026-10-17T13:20:00"))).not.toContain("data-timeline");
    expect(html(friday("2026-10-16T13:10:00"))).toMatch(/Khutbah sedang disampaikan[\s\S]*Dijangka tamat ±/);
    expect(html(state("2026-10-17T12:58:00"))).toMatch(/Zohor<\/span> dalam/);
    for (const layout of ["full", "bottom", "side"] as const) expect(html(friday("2026-10-16T10:00:00"), layout)).toContain("data-friday-strip");
  });

  it("showArabic off: no Arabic on azan/iqamah; lite: no glow or blur", () => {
    expect(html(state("2026-10-17T13:02:00"))).toContain('lang="ar"');
    expect(html(state("2026-10-17T13:02:00", { showArabic: false }))).not.toContain('lang="ar"');
    expect(html(state("2026-10-17T13:09:00", { showArabic: false }))).not.toContain('lang="ar"');
    const lite = html(state("2026-10-17T14:00:00", { lite: true }), "bottom", { kind: "poster", imageUrl: "/x.svg" });
    expect(lite).not.toMatch(/box-shadow:0 0|blur\(/);
  });

  it("all 10 templates render in every area; Kematian has no accent or dark label", () => {
    const s = state("2026-10-17T10:00:00");
    for (const key of TEMPLATE_KEYS) for (const layout of ["bottom", "side", "poster"] as const) expect(() => html(s, layout, sampleSlide(key))).not.toThrow();
    const k = html(s, "side", sampleSlide("kematian"));
    const card = k.slice(k.indexOf("data-poster-area"), k.indexOf("width:600px"));
    expect(card).not.toContain("background:#10151F");
    expect(card).not.toContain("#EDC27F");
  });
});
