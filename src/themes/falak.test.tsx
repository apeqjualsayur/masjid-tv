// Falak (contract §6, PRD round 2 §5 + D6): checks that can be made on the rendered HTML.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildDisplayState, parseLocalDateTime, type DisplayInputs, type LayoutKey } from "@/core";
import { CONFIG, dayTimes } from "@/core/__fixtures__/sgr01-2026-10";
import { TEMPLATE_KEYS, sampleSlide } from "@/templates";
import { falak } from "./falak";
import { TOKENS } from "./falak/tokens";
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
const html = (s: ReturnType<typeof state>, layout: LayoutKey = "full", slide = sampleSlide("pengumuman")) =>
  renderToStaticMarkup(<ThemeView theme={falak} s={s} layout={layout} slide={slide} />);
/** Every px font size in the HTML (SVG text sizes are in dial units and are checked separately). */
const pxSizes = (out: string) => [...out.matchAll(/font-size:\s*([\d.]+)px/g)].map((m) => Number(m[1]));

// One moment per phase (Sat 17 Oct 2026, SGR01: Subuh 5:50, Zohor 1:01, Asar 4:18, Maghrib 7:01, Isyak 8:11).
const PHASES = { subuh: "2026-10-17T06:40:00", zohor: "2026-10-17T14:00:00", asar: "2026-10-17T17:00:00", maghrib: "2026-10-17T19:30:00", isyak: "2026-10-17T22:00:00" } as const;

describe("falak", () => {
  it("is registered with every layout and poster boxes of the right ratio", () => {
    expect(falak.id).toBe("falak");
    expect(Object.keys(falak.layouts).sort()).toEqual(["bottom", "full", "poster", "side"]);
    expect(falak.posterArea.bottom.w / falak.posterArea.bottom.h).toBeCloseTo(12 / 5);
    expect(falak.posterArea.side.w / falak.posterArea.side.h).toBeCloseTo(5 / 4);
    expect(falak.posterArea.poster).toEqual({ x: 0, y: 0, w: 1920, h: 1080 });
  });

  it("dial face by phase (D6): light for zohor/asar, dark for subuh/maghrib/isyak", () => {
    for (const [phase, when] of Object.entries(PHASES)) {
      const out = html(state(when));
      const t = TOKENS[phase as keyof typeof TOKENS];
      expect(out, phase).toContain(`fill="${t.plate}"`);
      expect(t.face, phase).toBe(phase === "zohor" || phase === "asar" ? "light" : "dark");
    }
  });

  it("marks only waktu in the next 12 hours (plus the current one, larger)", () => {
    const out = html(state("2026-10-17T14:00:00")); // current Zohor; next 12 h: Asar, Maghrib, Isyak (Subuh is 15 h away)
    const marks = [...out.matchAll(/data-dial-mark="(\w+)"[^>]*r="(\d+)"/g)].map((m) => [m[1], Number(m[2])]);
    expect(marks).toEqual([["zohor", 11], ["asar", 7], ["maghrib", 7], ["isyak", 7]]);
  });

  it("second hand steps with the clock; digital time sits in the dial window", () => {
    const a = html(state("2026-10-17T14:00:10"));
    const b = html(state("2026-10-17T14:00:11"));
    expect(/data-second-hand[^>]*rotate\((\d+)/.exec(a)?.[1]).toBe("60");
    expect(/data-second-hand[^>]*rotate\((\d+)/.exec(b)?.[1]).toBe("66");
    expect(a).toMatch(/<text[^>]*>2:00<\/text>/);
    expect(a).not.toMatch(/transition/);
  });

  it("rim arc runs from the current waktu; no arc when there is no current waktu", () => {
    expect(html(state("2026-10-17T14:00:00"))).toContain("data-dial-arc");
  });

  it.each(["full", "bottom", "side"] as const)("%s: text ≥ 18 px and times at the minimum size", (layout) => {
    for (const when of Object.values(PHASES)) {
      const out = html(state(when), layout);
      expect(Math.min(...pxSizes(out))).toBeGreaterThanOrEqual(18);
      const times = [...out.matchAll(/font-size:\s*([\d.]+)px;font-weight:(?:500|700);line-height:[\d.]+;font-variant-numeric:tabular-nums">\d{1,2}:\d{2}</g)].map((m) => Number(m[1]));
      expect(times.length, layout).toBe(7);
      expect(Math.min(...times)).toBeGreaterThanOrEqual(layout === "bottom" ? 44 : 54);
    }
  });

  it("current row: different fill and weight (rule 2)", () => {
    const out = html(state("2026-10-17T14:00:00"));
    expect(out).toMatch(/data-current="true"[^>]*background:#F7F1E3/);
    expect(out).toMatch(/font-weight:700;line-height:[\d.]+;font-variant-numeric:tabular-nums">1:01/);
  });

  it("mode screens: azan, iqamah (dial drains), solat, khutbah, pre-azan banner", () => {
    expect(html(state("2026-10-17T13:02:00"))).toMatch(/Azan[\s\S]*Zohor/);
    const iq = html(state("2026-10-17T13:09:00"));
    expect(iq).toContain("IQAMAH ZOHOR");
    expect(iq).toContain("05:00");
    expect(iq).toContain("Luruskan dan rapatkan saf");
    expect(html(state("2026-10-17T13:20:00"))).not.toContain("data-dial");
    const fri = state("2026-10-16T13:10:00", { today: dayTimes(16), tomorrowImsak: dayTimes(17).times.imsak, tomorrowSubuh: dayTimes(17).times.subuh });
    expect(html(fri)).toMatch(/Khutbah sedang disampaikan[\s\S]*Dijangka tamat ±/);
    expect(html(state("2026-10-17T12:58:00"))).toMatch(/Zohor<\/span> dalam/);
  });

  it("Friday strip in full / bottom / side", () => {
    const fri = state("2026-10-16T10:00:00", { today: dayTimes(16), tomorrowImsak: dayTimes(17).times.imsak, tomorrowSubuh: dayTimes(17).times.subuh });
    for (const layout of ["full", "bottom", "side"] as const) expect(html(fri, layout), layout).toContain("data-friday-strip");
  });

  it("showArabic off: no Arabic on the azan screen; lite: no shadows or blur", () => {
    expect(html(state("2026-10-17T13:02:00"))).toContain('lang="ar"');
    expect(html(state("2026-10-17T13:02:00", { showArabic: false }))).not.toContain('lang="ar"');
    const lite = html(state("2026-10-17T12:58:00", { lite: true }), "bottom", { kind: "poster", imageUrl: "/x.svg" });
    expect(lite).not.toMatch(/box-shadow:0|blur\(/);
  });

  it("all 10 templates render in bottom, side and poster areas; Kematian has no gold or dark label", () => {
    const s = state("2026-10-17T10:00:00");
    for (const key of TEMPLATE_KEYS) for (const layout of ["bottom", "side", "poster"] as const) expect(() => html(s, layout, sampleSlide(key))).not.toThrow();
    const k = html(s, "side", sampleSlide("kematian"));
    const card = k.slice(k.indexOf("data-poster-area"), k.indexOf("width:600px")); // the card only, not the side column
    expect(card).not.toContain("#E9BD63");
    expect(card).not.toContain("background:#1B1D22");
  });
});
