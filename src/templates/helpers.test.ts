import { describe, expect, it } from "vitest";
import { formatRinggit, infaqProgress, kewanganTotals, slideTitle } from "./helpers";
import { SAMPLE_FIELDS, sampleSlide } from "./samples";
import { TEMPLATE_KEYS } from "./types";

describe("template helpers", () => {
  it("formats ringgit", () => {
    expect(formatRinggit(3250)).toBe("RM 3,250.00");
    expect(formatRinggit(820.5)).toBe("RM 820.50");
    expect(formatRinggit(1234567.891)).toBe("RM 1,234,567.89");
    expect(formatRinggit(0)).toBe("RM 0.00");
    expect(formatRinggit(-12)).toBe("-RM 12.00");
  });

  it("kewangan totals", () => {
    expect(kewanganTotals(SAMPLE_FIELDS.kewangan)).toEqual({ income: 4070.5, expense: 1060 });
  });

  it("infaq progress is clamped and safe", () => {
    expect(infaqProgress({ collected: 48250, target: 120000 })).toBeCloseTo(0.402);
    expect(infaqProgress({ collected: 200, target: 100 })).toBe(1);
    expect(infaqProgress({ collected: 50, target: 0 })).toBe(0);
  });

  it("there is a sample for every template", () => {
    for (const k of TEMPLATE_KEYS) expect(sampleSlide(k)).toMatchObject({ kind: "template", template: k });
  });
});

describe("slideTitle", () => {
  it("one line per template for admin lists", () => {
    expect(slideTitle("kuliah", { series: "Kuliah Maghrib", topic: "[Tajuk]" })).toBe("Kuliah Maghrib: [Tajuk]");
    expect(slideTitle("kematian", { name: "[Nama]" })).toBe("[Nama]");
    expect(slideTitle("infaq", { fundName: "Tabung [X]" })).toBe("Tabung [X]");
    expect(slideTitle("ucapan", { occasion: "aidilfitri", message: "x" })).toBe("Selamat Hari Raya Aidilfitri");
    expect(slideTitle("pengumuman", { title: "  [Tajuk]  " })).toBe("[Tajuk]");
    expect(slideTitle("poster", {})).toBe("");
  });
});
