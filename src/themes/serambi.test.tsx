// Serambi-specific contract rules (01-theme-contract.md section 4).
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildDisplayState, parseLocalDateTime, type DisplayInputs } from "@/core";
import { CONFIG, dayTimes } from "@/core/__fixtures__/sgr01-2026-10";
import { SAMPLE_POSTER, TEMPLATE_KEYS, sampleSlide, type SlideView } from "@/templates";
import { getTheme } from "./registry";
import { C, SKY } from "./serambi/tokens";
import { ThemeView } from "./ThemeView";

const state = (when: string, extra: Partial<DisplayInputs> = {}) =>
  buildDisplayState({
    at: parseLocalDateTime(`2026-10-17T${when}`)!,
    today: dayTimes(17),
    tomorrowImsak: dayTimes(18).times.imsak,
    tomorrowSubuh: dayTimes(18).times.subuh,
    clock24h: false,
    showArabic: true,
    ticker: [],
    lite: false,
    masjid: { fullName: "Nama Masjid / Surau", shortName: "NM" },
    modeConfig: CONFIG,
    ...extra,
  });

const { theme } = getTheme("serambi");
const html = (s: ReturnType<typeof state>, layout: "full" | "bottom" | "side" = "full", slide: SlideView = sampleSlide("program")) =>
  renderToStaticMarkup(<ThemeView theme={theme} s={s} layout={layout} slide={slide} />);

/** The style attribute of the arch for a waktu. */
const arch = (h: string, key: string) => h.match(new RegExp(`data-arch="${key}" style="([^"]*)"`))?.[1] ?? "";

describe("serambi arches", () => {
  const h = html(state("14:30:00")); // Zohor current, Asar next

  it("is registered", () => expect(theme.id).toBe("serambi"));

  it("explicit px radius, never 999px", () => {
    expect(arch(h, "zohor")).toContain("border-radius:118px 118px 18px 18px");
    expect(arch(html(state("14:30:00"), "bottom"), "zohor")).toContain("border-radius:93px 93px 14px 14px");
    expect(arch(html(state("14:30:00"), "side"), "zohor")).toContain("border-radius:19px 19px 6px 6px");
    for (const k of ["imsak", "subuh", "syuruk", "zohor", "asar", "maghrib", "isyak"]) expect(arch(h, k)).not.toContain("999px");
  });

  it("each arch shows its own waktu sky, whatever the phase", () => {
    for (const when of ["06:30:00", "14:30:00", "22:00:00"]) {
      const page = html(state(when));
      for (const k of ["imsak", "zohor", "isyak"] as const) expect(arch(page, k)).toContain(SKY[k].sky);
    }
  });

  it("current is taller with gold ring and glow; next has the thin ring; past at 0.42", () => {
    expect(arch(h, "zohor")).toContain("height:620px");
    expect(arch(h, "zohor")).toContain(`box-shadow:0 0 0 4px ${C.gold}, 0 0 70px`);
    expect(arch(h, "asar")).toContain("height:560px");
    expect(arch(h, "asar")).toContain("box-shadow:0 0 0 2px rgba(227,176,75,.55)");
    expect(arch(h, "subuh")).toContain("opacity:0.42");
    expect(arch(h, "maghrib")).toContain("opacity:0.92");
    expect(h).toContain(">SEKARANG<");
    expect(h).toContain(">SETERUSNYA<");
  });

  it("bottom bar: current +50 px", () => {
    const b = html(state("14:30:00"), "bottom");
    expect(arch(b, "zohor")).toContain("height:300px");
    expect(arch(b, "asar")).toContain("height:250px");
  });

  it("ambient glow follows the current arch (next arch when nothing is current)", () => {
    expect(html(state("14:30:00"))).toContain(`radial-gradient(ellipse 70% 60% at 50% 100%, ${SKY.zohor.glow} 0%`);
    expect(html(state("19:40:00"))).toContain(`radial-gradient(ellipse 70% 60% at 50% 100%, ${SKY.maghrib.glow} 0%`);
    expect(html(state("09:00:00"))).toContain(`radial-gradient(ellipse 70% 60% at 50% 100%, ${SKY.zohor.glow} 0%`);
  });

  it("no SEKARANG between Syuruk and Zohor", () => {
    expect(html(state("09:00:00"))).not.toContain(">SEKARANG<");
  });

  it("lite: no glows, no ambient radial; ring and layout kept", () => {
    const lite = html(state("14:30:00", { lite: true }));
    expect(lite).not.toContain("data-ambient");
    expect(lite).not.toContain("0 0 70px");
    expect(arch(lite, "zohor")).toContain(`box-shadow:0 0 0 4px ${C.gold}`);
    expect(arch(lite, "zohor")).toContain("height:620px");
    const poster = html(state("14:30:00", { lite: true }), "side", SAMPLE_POSTER);
    expect(poster).not.toContain("blur(");
    expect(poster).toContain("object-fit:contain");
  });

  it("showArabic false hides the Kufi waktu names", () => {
    expect(html(state("14:30:00"))).toContain("ظهر");
    expect(html(state("14:30:00", { showArabic: false }))).not.toContain("ظهر");
  });
});

describe("serambi screens", () => {
  it("iqamah: one large arch filling with gold light from the bottom by progress", () => {
    const h = html(state("13:09:00")); // halfway through Zohor iqamah
    expect(h).toContain("data-big-arch");
    expect(h).toMatch(/data-fill="true" style="[^"]*bottom:0;height:50%/);
    expect(h).toContain(">05:00<");
    expect(h).toContain("minit lagi");
    expect(html(state("13:04:00"))).not.toContain("data-fill"); // nothing filled at the start
  });

  it("iqamah lite drops the arch glow", () => {
    expect(html(state("13:09:00"))).toContain("0 0 120px");
    expect(html(state("13:09:00", { lite: true }))).not.toContain("0 0 120px");
  });

  it("azan, khutbah, solat, pre-azan banner", () => {
    expect(html(state("13:02:00"))).toContain(">Azan<");
    expect(html(state("13:20:00", { forceFriday: true }))).toContain("disampaikan");
    expect(html(state("13:20:00"))).toContain("background:#05080A");
    expect(html(state("12:58:00"))).toMatch(/Zohor<\/span> dalam 3 minit/);
  });
});

describe("serambi templates", () => {
  for (const key of TEMPLATE_KEYS) {
    for (const layout of ["bottom", "side"] as const) {
      it(`${key} renders in ${layout}`, () => {
        expect(html(state("14:30:00"), layout, sampleSlide(key)).length).toBeGreaterThan(1000);
      });
    }
  }

  it("program wide: date in a gold arch, Tempat / Anjuran / Hubungi details", () => {
    const h = html(state("14:30:00"), "bottom", sampleSlide("program"));
    expect(h).toContain("border-radius:210px 210px 24px 24px");
    for (const k of ["Tempat", "Anjuran", "Hubungi"]) expect(h).toContain(`>${k}<`);
  });

  it("ayat side: Amiri Arabic inside the arch frame with source", () => {
    const h = html(state("14:30:00"), "side", sampleSlide("ayat"));
    expect(h).toContain("border-radius:460px 460px 28px 28px");
    expect(h).toMatch(/lang="ar" dir="rtl" style="font-family:var\(--font-amiri\)/);
    expect(h).toContain("Tafsir Pimpinan Ar-Rahman (JAKIM)");
  });

  it("kematian: no gold, no arch frame, in both areas", () => {
    for (const layout of ["bottom", "side"] as const) {
      const h = html(state("14:30:00"), layout, sampleSlide("kematian"));
      const card = layout === "side" ? h.split("width:600px")[0] : h.split("height:310px")[0];
      expect(card).not.toContain(C.gold);
      expect(card).not.toContain("227,176,75");
    }
  });
});