// Seterusnya (contract §9, PRD round 2 §5 and D5): checks that can be made on the rendered HTML, plus
// the colour contrast of every text pair on every phase background (WCAG AA).
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildDisplayState, countdownRing, parseLocalDateTime, type DisplayInputs, type LayoutKey } from "@/core";
import { CONFIG, dayTimes } from "@/core/__fixtures__/sgr01-2026-10";
import { TEMPLATE_KEYS, sampleSlide } from "@/templates";
import { seterusnya } from "./seterusnya";
import { BG, S } from "./seterusnya/tokens";
import { ThemeView } from "./ThemeView";

const state = (when: string, extra: Partial<DisplayInputs> = {}) =>
  buildDisplayState({
    at: parseLocalDateTime(when)!,
    today: dayTimes(17), // Sat: Imsak 5:40, Subuh 5:50, Syuruk 6:56, Zohor 1:01, Asar 4:18, Maghrib 7:01, Isyak 8:11
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
  renderToStaticMarkup(<ThemeView theme={seterusnya} s={s} layout={layout} slide={slide} />);
const pxSizes = (out: string) => [...out.matchAll(/font-size:\s*([\d.]+)px/g)].map((m) => Number(m[1]));
const cell = (out: string, key: string) => new RegExp(`data-cell="${key}"[^>]*>`).exec(out)?.[0] ?? "";
const seconds = (out: string) => Object.fromEntries([...out.matchAll(/data-cell="(\w+)"[\s\S]*?data-second="(\w+)"/g)].map((m) => [m[1], m[2]]));
const PHASES = ["2026-10-17T06:40:00", "2026-10-17T14:00:00", "2026-10-17T17:00:00", "2026-10-17T19:30:00", "2026-10-17T22:00:00"];

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
const alpha = (rgba: string) => Number(/,([\d.]+)\)$/.exec(rgba)![1]);

describe("seterusnya", () => {
  it("is registered with every layout and poster boxes of the right ratio", () => {
    expect(seterusnya.id).toBe("seterusnya");
    expect(Object.keys(seterusnya.layouts).sort()).toEqual(["bottom", "full", "poster", "side"]);
    expect(seterusnya.posterArea.bottom).toEqual({ x: 48, y: 24, w: 1824, h: 760 });
    expect(seterusnya.posterArea.side.w / seterusnya.posterArea.side.h).toBeCloseTo(5 / 4);
    expect(seterusnya.posterArea.poster).toEqual({ x: 0, y: 0, w: 1920, h: 1080 });
  });

  it("hero = s.next with azan and iqamah (azan + iqamahMin, D5) in every layout", () => {
    const s = state("2026-10-17T14:00:00");
    expect(s.next.key).toBe("asar");
    for (const layout of ["full", "bottom", "side"] as const) {
      const out = html(s, layout);
      expect(out).toMatch(/data-hero-name="true"[^>]*>Asar</);
      if (layout !== "side") {
        expect(out).toMatch(new RegExp(`data-hero="azan"[\\s\\S]*?>${s.next.time}<`));
        expect(out).toMatch(new RegExp(`data-hero="iqamah"[\\s\\S]*?>${s.next.iqamah}<`));
      }
    }
    expect(s.next.iqamah).toBe("4:28"); // 4:18 + 10 min
  });

  it("every waktu shows azan + iqamah; none for Imsak and Syuruk; Friday Jumaat shows the khutbah start", () => {
    for (const layout of ["full", "bottom", "side"] as const) {
      expect(seconds(html(state("2026-10-17T14:00:00"), layout))).toEqual({ imsak: "none", subuh: "iqamah", syuruk: "none", zohor: "iqamah", asar: "iqamah", maghrib: "iqamah", isyak: "iqamah" });
      const f = friday("2026-10-16T10:00:00");
      const out = html(f, layout);
      expect(seconds(out).zohor).toBe("khutbah");
      expect(out).toContain(f.friday!.khutbahStart);
    }
    const hero = html(friday("2026-10-16T10:00:00"));
    expect(hero).toMatch(/data-hero-name="true"[^>]*>Jumaat</);
    expect(hero).toContain('data-hero="khutbah"');
    expect(hero).not.toContain('data-hero="iqamah"');
  });

  it("current and next differ in fill and weight, not colour alone (rule 2)", () => {
    const out = html(state("2026-10-17T14:00:00"));
    const cur = cell(out, "zohor");
    const nxt = cell(out, "asar");
    expect(cur).toContain(`background:${S.current}`);
    expect(cur).toContain(`border:3px solid ${S.currentBorder}`);
    expect(nxt).toContain(`background:${S.next}`);
    expect(out).toMatch(/data-cell="zohor"[\s\S]*?font-weight:800[\s\S]*?data-time="true" style="font-size:54px;font-weight:700/);
    expect(out).toMatch(/data-cell="maghrib"[\s\S]*?font-weight:700[\s\S]*?data-time="true" style="font-size:54px;font-weight:500/);
  });

  it("ring: Full changes every second, Bottom once a minute, Side has none", () => {
    const ring = (out: string) => /data-ring="([\d.]+)"/.exec(out)?.[1];
    const a = state("2026-10-17T14:00:05");
    const b = state("2026-10-17T14:00:55");
    expect(ring(html(a))).not.toBe(ring(html(b)));
    expect(ring(html(a, "bottom"))).toBe(ring(html(b, "bottom")));
    expect(ring(html(a))).toBe(countdownRing(a, 1000).remaining.toFixed(3));
    expect(html(a, "side")).not.toContain("data-ring");
  });

  it.each(["full", "bottom", "side"] as const)("%s: text ≥ 18 px; prayer times at the minimum size", (layout) => {
    for (const when of PHASES) {
      const out = html(state(when), layout);
      expect(Math.min(...pxSizes(out))).toBeGreaterThanOrEqual(18);
      const times = [...out.matchAll(/data-time="true" style="[^"]*?font-size:([\d.]+)px/g)].map((m) => Number(m[1]));
      expect(times).toHaveLength(7);
      expect(Math.min(...times)).toBeGreaterThanOrEqual(layout === "bottom" ? 44 : 54);
    }
  });

  it("iqamah screen: azan + iqamah times, countdown, shrinking bar (half the time = half the bar)", () => {
    const out = html(state("2026-10-17T13:09:00")); // Zohor 1:01 + 3 min azan; iqamah 10 min → 5 min left
    expect(out).toContain("05:00");
    expect(out).toMatch(/Iqamah Zohor dalam/);
    expect(out).toContain("1:11"); // iqamah time 1:01 + 10
    expect(out).toMatch(/data-iqamah-bar="0.500" style="width:50%/);
  });

  it("mode screens: azan, solat, khutbah, pre-azan banner; Friday strip in every layout", () => {
    expect(html(state("2026-10-17T13:02:00"))).toMatch(/Azan[\s\S]*Zohor/);
    expect(html(state("2026-10-17T13:20:00"))).not.toContain("data-cell");
    expect(html(friday("2026-10-16T13:10:00"))).toMatch(/Khutbah sedang disampaikan[\s\S]*Dijangka tamat ±/);
    expect(html(state("2026-10-17T12:58:00"))).toMatch(/Zohor<\/span> dalam/);
    for (const layout of ["full", "bottom", "side"] as const) expect(html(friday("2026-10-16T10:00:00"), layout)).toContain("data-friday-strip");
  });

  it("showArabic off: no Arabic on azan/iqamah; lite: no shadow or blur", () => {
    expect(html(state("2026-10-17T13:02:00"))).toContain('lang="ar"');
    expect(html(state("2026-10-17T13:02:00", { showArabic: false }))).not.toContain('lang="ar"');
    expect(html(state("2026-10-17T13:09:00", { showArabic: false }))).not.toContain('lang="ar"');
    const lite = html(state("2026-10-17T12:58:00", { lite: true }), "bottom", { kind: "poster", imageUrl: "/x.svg" });
    expect(lite).not.toMatch(/box-shadow:0|blur\(/);
  });

  it("all 10 templates render in every area; Kematian has no phase colour", () => {
    const s = state("2026-10-17T10:00:00");
    for (const key of TEMPLATE_KEYS) for (const layout of ["bottom", "side", "poster"] as const) expect(() => html(s, layout, sampleSlide(key))).not.toThrow();
    const k = html(s, "side", sampleSlide("kematian"));
    const card = k.slice(k.indexOf("data-poster-area"), k.indexOf("width:660px"));
    for (const bg of Object.values(BG)) expect(card).not.toContain(bg);
  });

  it("WCAG AA: every text pair ≥ 4.5:1 in every phase", () => {
    const white = rgb(S.text);
    const black = [0, 0, 0];
    for (const [phase, bg] of Object.entries(BG)) {
      const b = rgb(bg);
      const pairs: [string, number][] = [
        ["text", contrast(white, b)],
        ["cell", contrast(white, over(black, b, alpha(S.cell)))],
        ["current cell", contrast(white, over(black, b, alpha(S.current)))],
        ["band (ticker, Friday strip)", contrast(white, over(black, b, alpha(S.band)))],
        ["next cell: phase ink on white", contrast(b, rgb(S.next))],
      ];
      for (const [what, c] of pairs) expect(c, `${phase}: ${what}`).toBeGreaterThanOrEqual(4.5);
    }
    for (const ink of [S.cardInk, S.cardMuted, S.cardLabel]) expect(contrast(rgb(ink), rgb(S.card)), ink).toBeGreaterThanOrEqual(4.5);
  });
});
