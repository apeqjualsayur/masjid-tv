// Kerawang (contract §8, PRD round 2 §5): checks that can be made on the rendered HTML, plus the colour
// contrast of every text pair on every phase background (WCAG AA).
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildDisplayState, parseLocalDateTime, type DisplayInputs, type LayoutKey } from "@/core";
import { CONFIG, dayTimes } from "@/core/__fixtures__/sgr01-2026-10";
import { TEMPLATE_KEYS, sampleSlide } from "@/templates";
import { kerawang } from "./kerawang";
import { PATTERN_DEFS } from "./kerawang/patterns";
import { BG, K, OPACITY } from "./kerawang/tokens";
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
  renderToStaticMarkup(<ThemeView theme={kerawang} s={s} layout={layout} slide={slide} />);
const pxSizes = (out: string) => [...out.matchAll(/font-size:\s*([\d.]+)px/g)].map((m) => Number(m[1]));
const panel = (out: string, key: string) => new RegExp(`data-panel="${key}"[^>]*>`).exec(out)?.[0] ?? "";
const PHASES = ["2026-10-17T06:40:00", "2026-10-17T14:00:00", "2026-10-17T17:00:00", "2026-10-17T19:30:00", "2026-10-17T22:00:00"];

// WCAG 2.x relative luminance and contrast; `over` = text drawn at an opacity over a background.
const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = (c: number[]) => {
  const l = c.map((v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
};
const over = (fg: number[], bg: number[], a: number) => fg.map((v, i) => v * a + bg[i] * (1 - a));
const contrast = (a: number[], b: number[]) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const band = (bg: string) => over(rgb(K.timber), rgb(bg), 0.6); // K.band = timber at 60 %

describe("kerawang", () => {
  it("is registered with every layout and poster boxes of the right ratio (side 1185×948)", () => {
    expect(kerawang.id).toBe("kerawang");
    expect(Object.keys(kerawang.layouts).sort()).toEqual(["bottom", "full", "poster", "side"]);
    expect(kerawang.posterArea.bottom).toEqual({ x: 48, y: 24, w: 1824, h: 760 });
    expect(kerawang.posterArea.side.w / kerawang.posterArea.side.h).toBeCloseTo(5 / 4);
    expect(kerawang.posterArea.side).toMatchObject({ w: 1185, h: 948 });
    expect(kerawang.posterArea.poster).toEqual({ x: 0, y: 0, w: 1920, h: 1080 });
  });

  it("seven arch panels; only the current one is gold-lit, with a glow and time 700", () => {
    const out = html(state("2026-10-17T14:00:00"));
    expect([...out.matchAll(/data-panel="(\w+)"/g)].map((m) => m[1])).toEqual(["imsak", "subuh", "syuruk", "zohor", "asar", "maghrib", "isyak"]);
    expect([...out.matchAll(/data-carving="on"/g)]).toHaveLength(1);
    expect(panel(out, "zohor")).toContain(`border:6px solid ${K.gold}`);
    expect(panel(out, "zohor")).toContain("box-shadow:0 0 105px 9px");
    expect(out).toMatch(/data-panel="zohor"[\s\S]*?data-time="true" style="font-size:69px;font-weight:700/);
    expect(out).toMatch(/data-panel="asar"[\s\S]*?data-time="true" style="font-size:69px;font-weight:500/);
    expect(panel(out, "zohor")).toMatch(/border-radius:129px 129px 21px 21px/);
  });

  it("past panels dim (never below 0.42), markers 0.82 while upcoming", () => {
    const op = (out: string, k: string) => Number(/opacity:([\d.]+)/.exec(panel(out, k))?.[1]);
    const noon = html(state("2026-10-17T14:00:00"));
    expect(op(noon, "subuh")).toBe(OPACITY.past);
    expect(op(noon, "zohor")).toBe(1);
    expect(op(noon, "asar")).toBe(1);
    expect(OPACITY.past).toBeGreaterThanOrEqual(0.42);
    const early = html(state("2026-10-17T04:00:00")); // before Imsak: everything upcoming
    expect(op(early, "imsak")).toBe(OPACITY.marker);
    expect(op(early, "syuruk")).toBe(OPACITY.marker);
  });

  it("carvings are SVG patterns defined once per stage and memoised (not redrawn per tick)", () => {
    const out = html(state("2026-10-17T14:00:00"));
    expect(out.match(/data-krw-defs/g)).toHaveLength(1);
    expect(out.match(/<pattern /g)).toHaveLength(3);
    const ids = [...out.matchAll(/<pattern id="([^"]+)"/g)].map((m) => m[1]);
    for (const id of ids) expect(out).toContain(`url(#${id})`);
    expect((PATTERN_DEFS as unknown as { $$typeof: symbol }).$$typeof).toBe(Symbol.for("react.memo"));
  });

  it("lite: no timber grain, no glow, no blur; layout identical", () => {
    const normal = html(state("2026-10-17T14:00:00"));
    expect(normal).toContain("repeating-linear-gradient");
    const lite = html(state("2026-10-17T14:00:00", { lite: true }), "bottom", { kind: "poster", imageUrl: "/x.svg" });
    expect(lite).not.toMatch(/repeating-linear-gradient|box-shadow:0 0|blur\(/);
    expect(html(state("2026-10-17T13:09:00", { lite: true }))).not.toMatch(/repeating-linear-gradient|box-shadow:0 0/);
  });

  it.each(["full", "bottom", "side"] as const)("%s: text ≥ 18 px; prayer times at the minimum size", (layout) => {
    for (const when of PHASES) {
      const out = html(state(when), layout);
      expect(Math.min(...pxSizes(out))).toBeGreaterThanOrEqual(18);
      const times = [...out.matchAll(/data-time="true" style="font-size:([\d.]+)px/g)].map((m) => Number(m[1]));
      expect(times).toHaveLength(7);
      expect(Math.min(...times)).toBeGreaterThanOrEqual(layout === "bottom" ? 44 : 54);
    }
  });

  it("iqamah: the arch fills with light from the bottom as time passes (half the time = half full)", () => {
    const out = html(state("2026-10-17T13:09:00")); // Zohor 1:01 + 3 min azan; iqamah 10 min → 5 min left
    expect(out).toContain("05:00");
    expect(out).toMatch(/data-iqamah-light="0.500" style="position:absolute;left:0;right:0;bottom:0;height:50%/);
    expect(out).toMatch(/data-iqamah-arch[^>]*border-radius:330px 330px 24px 24px/);
  });

  it("mode screens: azan, solat, khutbah, pre-azan banner; Friday strip in every layout", () => {
    expect(html(state("2026-10-17T13:02:00"))).toMatch(/Azan[\s\S]*Zohor/);
    expect(html(state("2026-10-17T13:20:00"))).not.toContain("data-panel");
    expect(html(friday("2026-10-16T13:10:00"))).toMatch(/Khutbah sedang disampaikan[\s\S]*Dijangka tamat ±/);
    expect(html(state("2026-10-17T12:58:00"))).toMatch(/Zohor<\/span> dalam/);
    for (const layout of ["full", "bottom", "side"] as const) expect(html(friday("2026-10-16T10:00:00"), layout)).toContain("data-friday-strip");
    expect(html(friday("2026-10-16T10:00:00"))).toMatch(/data-panel="zohor"[\s\S]*?Jumaat/);
  });

  it("showArabic off: no Arabic on azan/iqamah", () => {
    expect(html(state("2026-10-17T13:02:00"))).toContain('lang="ar"');
    expect(html(state("2026-10-17T13:02:00", { showArabic: false }))).not.toContain('lang="ar"');
    expect(html(state("2026-10-17T13:09:00", { showArabic: false }))).not.toContain('lang="ar"');
  });

  it("all 10 templates render in every area; Kematian is a plain dark panel: no pattern, no gold", () => {
    const s = state("2026-10-17T10:00:00");
    for (const key of TEMPLATE_KEYS) for (const layout of ["bottom", "side", "poster"] as const) expect(() => html(s, layout, sampleSlide(key))).not.toThrow();
    for (const layout of ["bottom", "side", "poster"] as const) {
      const k = html(s, layout, sampleSlide("kematian"));
      const start = k.indexOf('data-card="sober"');
      expect(start).toBeGreaterThan(0);
      const card = k.slice(start, k.indexOf("</div></div></div>", start));
      expect(card).toContain(`background:${K.timber}`);
      for (const gold of [K.gold, K.awan]) expect(card).not.toContain(gold);
      expect(card).not.toMatch(/url\(#|data-carving/);
      expect(k).not.toContain('data-card="framed"');
    }
    expect(html(s, "side", sampleSlide("kewangan"))).toContain(`border:9px solid ${K.awan}`);
  });

  it("WCAG AA: body text ≥ 4.5:1 on every phase background, band, plaque and card", () => {
    const text = rgb(K.text);
    const gold = rgb(K.gold);
    for (const [phase, bg] of Object.entries(BG)) {
      const b = rgb(bg);
      const pairs: [string, number][] = [
        ["text", contrast(text, b)],
        ["text at 85 %", contrast(over(text, b, 0.85), b)],
        ["gold status", contrast(gold, b)],
        ["gold on band (Friday strip, ticker label)", contrast(gold, band(bg))],
        ["text on band (ticker)", contrast(text, band(bg))],
        ["past plaque text", contrast(over(text, b, OPACITY.past), over(rgb(K.plaque), b, OPACITY.past))],
      ];
      for (const [what, c] of pairs) expect(c, `${phase}: ${what}`).toBeGreaterThanOrEqual(4.5);
    }
    const card = rgb(K.card);
    for (const ink of [K.cardInk, K.cardMuted, K.cardLabel]) expect(contrast(rgb(ink), card), ink).toBeGreaterThanOrEqual(4.5);
    expect(contrast(rgb(K.text), rgb(K.plaque))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(rgb(K.timber), gold)).toBeGreaterThanOrEqual(4.5); // lit plaque, pre-azan pill
    expect(contrast(gold, rgb(K.timber))).toBeGreaterThanOrEqual(4.5); // template label pill
    for (const ink of [K.soberText, K.soberMuted]) expect(contrast(rgb(ink), rgb(K.timber)), ink).toBeGreaterThanOrEqual(4.5);
  });
});
