// Alam-specific contract rules (01-theme-contract.md section 3).
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildDisplayState, parseLocalDateTime, type DisplayInputs, type PhaseKey } from "@/core";
import { CONFIG, dayTimes } from "@/core/__fixtures__/sgr01-2026-10";
import { SAMPLE_POSTER, TEMPLATE_KEYS, sampleSlide, type SlideView } from "@/templates";
import { nextLayers } from "./alam/landscape";
import { A, SCENE } from "./alam/tokens";
import { getTheme } from "./registry";
import { ThemeView } from "./ThemeView";

const state = (when: string, extra: Partial<DisplayInputs> = {}) =>
  buildDisplayState({
    at: parseLocalDateTime(`2026-10-17T${when}`)!,
    today: dayTimes(17),
    tomorrowImsak: dayTimes(18).times.imsak,
    tomorrowSubuh: dayTimes(18).times.subuh,
    clock24h: false,
    showArabic: true,
    ticker: ["[Teks pengumuman]"],
    lite: false,
    masjid: { fullName: "Nama Masjid / Surau", shortName: "NM" },
    modeConfig: CONFIG,
    ...extra,
  });

const { theme } = getTheme("alam");
const html = (s: ReturnType<typeof state>, layout: "full" | "bottom" | "side" = "full", slide: SlideView = sampleSlide("kuliah")) =>
  renderToStaticMarkup(<ThemeView theme={theme} s={s} layout={layout} slide={slide} />);
const card = (h: string, key: string) => h.match(new RegExp(`data-card="${key}" style="([^"]*)"`))?.[1] ?? "";

describe("alam landscape", () => {
  it("is registered", () => expect(theme.id).toBe("alam"));

  it("every scene colour comes from the phase token table", () => {
    const times: [string, PhaseKey][] = [["06:30:00", "subuh"], ["14:30:00", "zohor"], ["17:00:00", "asar"], ["19:40:00", "maghrib"], ["22:00:00", "isyak"]];
    for (const [when, phase] of times) {
      const h = html(state(when));
      const p = SCENE[phase];
      expect(h).toContain(`data-scene="${phase}"`);
      expect(h).toContain(`background:${p.sky}`);
      for (const c of [p.l1, p.l2, p.l3, p.sun]) expect(h).toContain(`fill="${c}"`);
      expect(h).toContain(`cx="${p.sx}" cy="${p.sy}" r="${p.sr}"`);
      expect(h).toContain(`opacity="${p.stars}"`);
    }
  });

  it("includes the mosque silhouette and the sun glow; lite drops the glow", () => {
    expect(html(state("14:30:00"))).toContain("data-mosque");
    expect(html(state("14:30:00"))).toContain("data-sun-glow");
    expect(html(state("14:30:00", { lite: true }))).not.toContain("data-sun-glow");
  });

  it("phase change: new palette fades in over the old one; lite switches instantly", () => {
    const start = [{ phase: "subuh" as const, id: 0, fading: false }];
    expect(nextLayers(start, "subuh", false)).toBe(start);
    expect(nextLayers(start, "zohor", false)).toEqual([
      { phase: "subuh", id: 0, fading: false },
      { phase: "zohor", id: 1, fading: true },
    ]);
    expect(nextLayers(start, "zohor", true)).toEqual([{ phase: "zohor", id: 1, fading: false }]);
    // a second change mid-fade keeps at most two layers
    const mid = nextLayers(start, "zohor", false);
    expect(nextLayers(mid, "asar", false)).toEqual([
      { phase: "zohor", id: 1, fading: false },
      { phase: "asar", id: 2, fading: true },
    ]);
  });
});

describe("alam glass and cards", () => {
  const h = html(state("14:30:00"));

  it("glass cards use backdrop-filter; lite uses solid rgba(8,18,28,0.55)", () => {
    expect(card(h, "asar")).toContain("backdrop-filter:blur(18px)");
    expect(card(h, "maghrib")).toContain(`background:${A.glass}`);
    const lite = html(state("14:30:00", { lite: true }));
    expect(lite).not.toContain("backdrop-filter");
    expect(card(lite, "maghrib")).toContain(`background:${A.glassLite}`);
    expect(lite).not.toContain("text-shadow:0 6px 40px");
  });

  it("current = white card with dark text; next = yellow border; chips", () => {
    expect(card(h, "zohor")).toContain(`background:${A.current}`);
    expect(card(h, "zohor")).toContain(`color:${A.currentFg}`);
    expect(card(h, "asar")).toContain(`border:2px solid ${A.yellow}`);
    expect(h).toContain(">Sekarang<");
    expect(h).toContain(">Seterusnya<");
    expect(html(state("09:00:00"))).not.toContain(">Sekarang<");
  });

  it("times meet the contract minimums: 56 full, 54 side, 44 bottom", () => {
    expect(h).toMatch(/font-size:56px;font-weight:800[^>]*>1:01</);
    expect(html(state("14:30:00"), "side")).toMatch(/font-size:54px;font-weight:800[^>]*>1:01</);
    expect(html(state("14:30:00"), "bottom")).toMatch(/font-size:44px;font-weight:800[^>]*>1:01</);
  });

  it("ticker band scrolls; lite shows it static", () => {
    expect(h).toContain("PENGUMUMAN");
    expect(h).toContain("data-marquee");
    expect(html(state("14:30:00", { lite: true }))).not.toContain("data-marquee");
  });

  it("showArabic false hides the Arabic names", () => {
    expect(h).toContain("ظهر");
    expect(html(state("14:30:00", { showArabic: false }))).not.toContain("ظهر");
  });

  it("poster uncropped over a blurred copy; lite has no blur", () => {
    const p = html(state("14:30:00"), "side", SAMPLE_POSTER);
    expect(p).toContain("object-fit:contain");
    expect(p).toContain("filter:blur(70px)");
    expect(html(state("14:30:00", { lite: true }), "side", SAMPLE_POSTER)).not.toContain("blur(");
  });
});

describe("alam screens", () => {
  it("iqamah: ring r=250 stroke 28, offset = circumference x progress, 168px countdown", () => {
    const h = html(state("13:09:00")); // progress 0.5
    const c = 2 * Math.PI * 250;
    expect(h).toContain(`stroke-dashoffset="${(c * 0.5).toFixed(1)}"`);
    expect(h).toContain('stroke-width="28"');
    expect(h).toMatch(/font-size:168px;font-weight:800[^>]*>05:00</);
    expect(h).toContain(A.iqamahBg);
  });

  it("azan, khutbah, solat, pre-azan banner", () => {
    expect(html(state("13:02:00"))).toContain(">AZAN<");
    expect(html(state("13:20:00", { forceFriday: true }))).toContain("Khutbah sedang disampaikan");
    expect(html(state("13:20:00"))).toContain(`background:${A.solatBg}`);
    expect(html(state("12:58:00"))).toContain("Zohor dalam 3 minit");
  });
});

describe("alam templates", () => {
  for (const key of TEMPLATE_KEYS) {
    for (const layout of ["bottom", "side"] as const) {
      it(`${key} renders in ${layout}`, () => {
        expect(html(state("14:30:00"), layout, sampleSlide(key)).length).toBeGreaterThan(1000);
      });
    }
  }

  it("kuliah: tag, title, bersama, Tarikh / Masa / Tempat tiles (A-Bottom)", () => {
    const h = html(state("14:30:00"), "bottom", sampleSlide("kuliah"));
    expect(h).toContain(">Kuliah Maghrib<");
    expect(h).toContain(">bersama<");
    for (const k of ["Tarikh", "Masa", "Tempat"]) expect(h).toContain(`>${k}<`);
  });

  it("kematian: no green, no icons, no star decoration", () => {
    for (const layout of ["bottom", "side"] as const) {
      const h = html(state("14:30:00"), layout, sampleSlide("kematian"));
      const cardHtml = h.slice(h.indexOf(A.card), layout === "bottom" ? h.indexOf("height:240px") : h.indexOf("width:544px"));
      expect(cardHtml).toContain("Makluman kematian");
      expect(cardHtml).not.toContain(A.green);
      expect(cardHtml).not.toContain("<svg");
    }
  });
});