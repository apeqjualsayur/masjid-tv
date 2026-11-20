// Notice stamp + countdown line in every theme and area (contract rules 21–23, PRD enhancements §3.4–3.5, §4.2).
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildDisplayState, parseLocalDateTime, templateLive, THEME_IDS, type LayoutKey, type ThemeId } from "@/core";
import { CONFIG, dayTimes } from "@/core/__fixtures__/sgr01-2026-10";
import { SAMPLE_FIELDS, type SlideView, type TemplateKey } from "@/templates";
import { getTheme } from "./registry";
import { NEW_DATE_TBA, STAMP_COLORS } from "./shared/notice-stamp";
import { ThemeView } from "./ThemeView";

const NOW = "2026-10-17T20:00:00";
const at = parseLocalDateTime(NOW)!;
const state = (layout: LayoutKey, phaseAt = NOW) =>
  buildDisplayState({
    at: parseLocalDateTime(phaseAt)!,
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

/** A template slide with the live data the TV would attach at NOW. */
function slide(key: TemplateKey, fields: Record<string, unknown>): SlideView {
  const live = templateLive(key, fields, at, false);
  return { kind: "template", template: key, fields, ...(live ? { live } : {}) } as unknown as SlideView;
}

const KULIAH_TANGGUH = slide("kuliah", {
  ...SAMPLE_FIELDS.kuliah, topic: "Adab Bertetangga", date: "Sabtu, 17 Oktober 2026", dateIso: "2026-10-17", time: "8:45 malam",
  notice: { kind: "tangguh", newAt: "2026-10-24T20:45", reason: "Penceramah uzur" },
});
const PROGRAM_BATAL = slide("program", {
  ...SAMPLE_FIELDS.program, title: "Hari Keluarga", date: "Ahad, 18 Oktober 2026", dateIso: "2026-10-18", time: "8:00 pagi", notice: { kind: "batal", reason: "Cuaca tidak mengizinkan" },
});
const MESYUARAT_TBA = slide("mesyuarat", { ...SAMPLE_FIELDS.mesyuarat, dateIso: "2026-10-18", notice: { kind: "tangguh", newAt: null } });
const KULIAH_SOON = slide("kuliah", { ...SAMPLE_FIELDS.kuliah, topic: "Adab", date: "Sabtu, 17 Oktober 2026", dateIso: "2026-10-17", time: "8:45 malam" }); // 45 min away
const PENANGGUHAN = slide("penangguhan", SAMPLE_FIELDS.penangguhan as unknown as Record<string, unknown>);

const LAYOUTS = ["bottom", "side", "poster"] as const;
const render = (id: ThemeId, layout: LayoutKey, sl: SlideView, phaseAt?: string) =>
  renderToStaticMarkup(<ThemeView theme={getTheme(id).theme} s={state(layout, phaseAt)} layout={layout} slide={sl} slideKey="k" />);
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe.each(THEME_IDS)("%s", (id) => {
  for (const layout of LAYOUTS) {
    it(`${layout}: kuliah + Tangguh with a new date → stamp, old date struck, new date, reason, countdown`, () => {
      const html = render(id, layout, KULIAH_TANGGUH);
      expect(html).toContain('data-notice-stamp="tangguh"');
      expect(html).toContain("DITANGGUHKAN");
      expect(html).toMatch(/<s [^>]*>Sabtu, 17 Oktober 2026 · 8:45 malam<\/s>/);
      expect(text(html)).toContain("Tarikh baru: Sabtu, 24 Okt · 8:45 malam");
      expect(text(html)).toContain("Sebab: Penceramah uzur");
      expect(html).toContain('data-countdown="days"');
      expect(text(html)).toContain("Lagi 7 hari");
      // The theme's own date/time items give way to the stamp.
      expect(text(html)).not.toMatch(/Tarikh(?! baru)|\bMasa\b/);
    });

    it(`${layout}: program + Batal → stamp, no countdown`, () => {
      const html = render(id, layout, PROGRAM_BATAL);
      expect(html).toContain('data-notice-stamp="batal"');
      expect(html).toContain("DIBATALKAN");
      expect(text(html)).toContain("Sebab: Cuaca tidak mengizinkan");
      expect(html).not.toContain("data-countdown");
      expect(text(html)).not.toContain("Tarikh baru");
    });

    it(`${layout}: mesyuarat + Tangguh without a date → "Tarikh baru akan dimaklumkan"`, () => {
      const html = render(id, layout, MESYUARAT_TBA);
      expect(text(html)).toContain(NEW_DATE_TBA);
      expect(html).not.toContain("data-countdown");
    });

    it(`${layout}: penangguhan → always the stamp`, () => {
      const html = render(id, layout, PENANGGUHAN);
      expect(html).toContain('data-notice-stamp="tangguh"');
      expect(text(html)).toContain("Tarikh baru: Sabtu, 5 Dis · 8:45 malam");
      expect(text(html)).toContain(SAMPLE_FIELDS.penangguhan.title);
    });

    it(`${layout}: kuliah 45 min away → "Bermula dalam 45:00", strong in weight 800, tabular numerals`, () => {
      const html = render(id, layout, KULIAH_SOON);
      expect(html).toContain('data-countdown="minutes"');
      expect(html).toMatch(/Bermula dalam <b style="font-weight:800;color:[^"]+">45:00<\/b>/);
      expect(html).toMatch(/data-countdown="minutes" style="[^"]*font-variant-numeric:tabular-nums/);
      expect(html).not.toContain("data-notice-stamp");
    });
  }

  it("without live data the activity slide renders as before (no stamp, no countdown)", () => {
    const plain = { kind: "template", template: "kuliah", fields: SAMPLE_FIELDS.kuliah } as SlideView;
    const html = render(id, "bottom", plain);
    expect(html).not.toContain("data-notice-stamp");
    expect(html).not.toContain("data-countdown");
  });

  it("Kematian is never affected", () => {
    const html = render(id, "bottom", slide("kematian", { ...SAMPLE_FIELDS.kematian, notice: { kind: "batal" } } as unknown as Record<string, unknown>));
    expect(html).not.toContain("data-notice-stamp");
    expect(html).not.toContain("data-countdown");
  });

  it("the stamp word is at least 48 px (12:5)", () => {
    const html = render(id, "bottom", KULIAH_TANGGUH);
    const word = /font-size:(\d+)px[^>]*>DITANGGUHKAN</.exec(html);
    expect(Number(word?.[1])).toBeGreaterThanOrEqual(48);
  });
});

it("Tenang in Isyak draws the stamp in the dark palette", () => {
  const html = render("tenang", "bottom", KULIAH_TANGGUH, "2026-10-17T21:00:00");
  expect(html).toContain(STAMP_COLORS.tangguh.dark.plate);
  expect(render("tenang", "bottom", KULIAH_TANGGUH, "2026-10-17T14:00:00")).toContain(STAMP_COLORS.tangguh.light.plate);
});

// ------------------------------------------------------------------ contrast (WCAG AA ≥ 4.5)

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

describe("stamp colours (rule 22: WCAG AA on its own plate)", () => {
  for (const kind of ["tangguh", "batal"] as const) {
    for (const tone of ["light", "dark"] as const) {
      it(`${kind} / ${tone}`, () => {
        const c = STAMP_COLORS[kind][tone];
        expect(contrast(c.badgeInk, c.badge)).toBeGreaterThanOrEqual(4.5);
        for (const fg of [c.ink, c.muted, c.strong]) expect(contrast(fg, c.plate), fg).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});
