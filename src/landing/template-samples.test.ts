import { describe, expect, it } from "vitest";
import { parseSlides } from "@/data";
import { TEMPLATE_KEYS } from "@/templates";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { TemplateMockup } from "./template-mockups";
import { LANDING_SAMPLES, MOCK_TEXT } from "./template-samples";
import ms from "./i18n/ms.json";
import en from "./i18n/en.json";

/** Every string inside a value (keys and array brackets are not text). */
const texts = (v: unknown): string[] => (typeof v === "string" ? [v] : v && typeof v === "object" ? Object.values(v).flatMap(texts) : []);
const PLACEHOLDER = /\[[^\]]*\]/;

describe("landing template thumbnails", () => {
  it("every template has a mockup with readable text (no 1920 stage) and no [ … ] placeholders", () => {
    for (const k of TEMPLATE_KEYS) {
      const html = renderToStaticMarkup(createElement(TemplateMockup, { k }));
      expect(html, k).toContain("aspect-[4/3]");
      expect(html, k).not.toContain("1920");
      expect(html.replace(/<[^>]+>/g, "").trim().length, k).toBeGreaterThan(10);
      expect(PLACEHOLDER.test(html.replace(/<[^>]+>/g, " ")), k).toBe(false);
      for (const px of [...html.matchAll(/text-\[([\d.]+)px\]/g)].map((m) => Number(m[1]))) expect(px, k).toBeGreaterThanOrEqual(8.5);
    }
  });

  it("Kematian shows no name and is grey only; Ayat shows no verse text (list awaiting review)", () => {
    expect(Object.keys(LANDING_SAMPLES)).not.toContain("kematian");
    expect(Object.keys(LANDING_SAMPLES)).not.toContain("ayat");
    const k = renderToStaticMarkup(createElement(TemplateMockup, { k: "kematian" }));
    expect(k).toContain(MOCK_TEXT.kematian);
    for (const hex of [...k.matchAll(/#([0-9A-F]{6})/gi)].map((m) => m[1])) {
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
      expect(Math.max(r, g, b) - Math.min(r, g, b), `#${hex} is not grey`).toBeLessThanOrEqual(8);
    }
    expect(renderToStaticMarkup(createElement(TemplateMockup, { k: "ayat" }))).not.toContain('lang="ar"');
  });

  it("samples are accepted by the TV and contain no [ … ] placeholders", () => {
    for (const [k, fields] of Object.entries(LANDING_SAMPLES)) {
      const r = parseSlides([{ id: k, type: "template", template_key: k, fields }]);
      expect(r.warnings, k).toEqual([]);
      expect(texts(fields).filter((t) => PLACEHOLDER.test(t)), k).toEqual([]);
    }
  });

  it("the landing copy has no [ … ] placeholders in either language", () => {
    expect(texts(ms).filter((t) => PLACEHOLDER.test(t))).toEqual([]);
    expect(texts(en).filter((t) => PLACEHOLDER.test(t))).toEqual([]);
  });
});