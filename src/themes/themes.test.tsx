// Renders every theme surface to HTML and checks the contract rules that can be checked
// automatically (01-theme-contract.md section 2). Visual matching is checked by eye.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildDisplayState, parseLocalDateTime, type DisplayInputs, type PhaseKey, type ThemeId } from "@/core";
import { CONFIG, dayTimes } from "@/core/__fixtures__/sgr01-2026-10";
import { SAMPLE_POSTER, TEMPLATE_KEYS, sampleSlide } from "@/templates";
import { availableThemes, getTheme } from "./registry";
import { TOKENS } from "./tenang/tokens";
import { ThemeView, UnavailableView } from "./ThemeView";

const state = (when: string, extra: Partial<DisplayInputs> = {}) =>
  buildDisplayState({
    at: parseLocalDateTime(when)!,
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

const { theme } = getTheme("tenang");
const html = (s: ReturnType<typeof state>, layout: "full" | "bottom" | "side" = "full", slide = sampleSlide("pengumuman")) =>
  renderToStaticMarkup(<ThemeView theme={theme} s={s} layout={layout} slide={slide} />);

describe("registry", () => {
  it("all three launch themes are built; an unknown id falls back with a warning", () => {
    expect(availableThemes().sort()).toEqual(["alam", "serambi", "tenang"]);
    expect(getTheme("tenang")).toEqual({ theme });
    expect(getTheme("alam").theme.id).toBe("alam");
    const unknown = getTheme("pink" as ThemeId);
    expect(unknown.theme.id).toBe("tenang");
    expect(unknown.warning).toMatch(/not built yet/);
  });
});

describe("tenang layouts", () => {
  const s = state("2026-10-17T14:30:36");
  for (const layout of ["full", "bottom", "side"] as const) {
    it(`${layout}: clock, all 7 times, current in accent at weight 700`, () => {
      const h = html(s, layout);
      expect(h).toContain(">2:30<");
      for (const t of ["5:40", "5:50", "6:56", "1:01", "4:18", "7:01", "8:11"]) expect(h).toContain(`>${t}<`);
      expect(h).toMatch(new RegExp(`font-weight:700;[^"]*color:${TOKENS.zohor.accent}[^>]*>1:01<`));
      expect(h).toContain("Asar dalam 1 jam 48 minit");
    });
  }

  it("phase colours follow the phase", () => {
    for (const [when, phase] of [["06:30", "subuh"], ["14:30", "zohor"], ["17:00", "asar"], ["19:30", "maghrib"], ["22:00", "isyak"]] as [string, PhaseKey][]) {
      expect(html(state(`2026-10-17T${when}:00`))).toContain(`background:${TOKENS[phase].bg}`);
    }
  });

  it("no Sekarang line between Syuruk and Zohor", () => {
    expect(html(state("2026-10-17T09:00:00"))).not.toContain("Waktu ");
    expect(html(state("2026-10-17T14:00:00"))).toContain("Waktu Zohor");
  });

  it("showArabic false hides the Arabic names", () => {
    expect(html(state("2026-10-17T14:30:36"))).toContain('lang="ar" dir="rtl"');
    expect(html(state("2026-10-17T14:30:36", { showArabic: false }))).not.toContain("ظهر");
  });

  it("lite drops shadows and the poster blur, keeps the layout", () => {
    const normal = html(state("2026-10-17T14:30:36"), "bottom", SAMPLE_POSTER);
    const lite = html(state("2026-10-17T14:30:36", { lite: true }), "bottom", SAMPLE_POSTER);
    expect(normal).toContain("box-shadow:0 18px 40px");
    expect(normal).toContain("blur(40px)");
    expect(lite).not.toContain("box-shadow:0");
    expect(lite).not.toContain("blur(");
    expect(lite).toContain("object-fit:contain");
  });

  it("poster is shown uncropped over a blurred copy", () => {
    const h = html(state("2026-10-17T14:30:36"), "side", SAMPLE_POSTER);
    expect(h).toContain("object-fit:contain");
    expect(h).toContain("object-fit:cover;filter:blur(40px)");
  });
});

describe("tenang screens", () => {
  it("pre-azan banner over the layout", () => {
    expect(html(state("2026-10-17T12:58:00"))).toMatch(/Zohor<\/span> dalam 3 minit/);
  });
  it("azan", () => expect(html(state("2026-10-17T13:02:00"))).toContain(">Azan<"));
  it("iqamah countdown, shrinking bar, saf reminder", () => {
    const h = html(state("2026-10-17T13:09:00"));
    expect(h).toContain(">05:00<");
    expect(h).toContain("width:50%");
    expect(h).toContain("Luruskan dan rapatkan saf");
    expect(h).toContain("Senyapkan telefon bimbit");
  });
  it("solat: near-black, clock only", () => {
    const h = html(state("2026-10-17T13:20:00"));
    expect(h).toContain("background:#06080B");
    expect(h).not.toContain("Zohor");
  });
  it("khutbah on Friday", () => {
    const h = html(state("2026-10-17T13:20:00", { forceFriday: true }));
    expect(h).toContain("Khutbah sedang disampaikan");
  });
  it("unavailable", () => {
    const h = renderToStaticMarkup(
      <UnavailableView theme={theme} u={{ clock: "10:00", seconds: "05", gregorian: "Selasa, 5 Januari 2027", message: "Data waktu tidak tersedia", masjid: { fullName: "M", shortName: "M" }, lite: false }} />,
    );
    expect(h).toContain("Data waktu tidak tersedia");
    expect(h).not.toMatch(/\d:\d\d<\/div>.*\d:\d\d<\/div>.*\d:\d\d<\/div>/); // no prayer times
  });
});

describe("tenang templates", () => {
  for (const key of TEMPLATE_KEYS) {
    for (const layout of ["bottom", "side"] as const) {
      it(`${key} renders in ${layout}`, () => {
        const h = html(state("2026-10-17T14:30:36"), layout, sampleSlide(key));
        expect(h.length).toBeGreaterThan(1000);
      });
    }
  }

  it("kematian uses no accent colour in any phase", () => {
    for (const phase of ["06:30", "14:30", "17:00", "19:30", "22:00"]) {
      const s = state(`2026-10-17T${phase}:00`);
      const card = html(s, "side", sampleSlide("kematian")).split("Makluman kematian")[1].split("width:520px")[0];
      expect(card).not.toContain(TOKENS[s.phase].accent);
    }
  });
});