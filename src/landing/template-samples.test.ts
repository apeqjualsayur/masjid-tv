import { describe, expect, it } from "vitest";
import { parseSlides } from "@/data";
import { TEMPLATE_KEYS } from "@/templates";
import { ABSTRACT_THUMBS, LANDING_SAMPLES } from "./template-samples";
import ms from "./i18n/ms.json";
import en from "./i18n/en.json";

/** Every string inside a value (keys and array brackets are not text). */
const texts = (v: unknown): string[] => (typeof v === "string" ? [v] : v && typeof v === "object" ? Object.values(v).flatMap(texts) : []);
const PLACEHOLDER = /\[[^\]]*\]/;

describe("landing template thumbnails", () => {
  it("every template is either rendered with landing sample data or shown abstract", () => {
    for (const k of TEMPLATE_KEYS) expect(Boolean(LANDING_SAMPLES[k]) !== Boolean(ABSTRACT_THUMBS[k]), k).toBe(true);
    expect(Object.keys(ABSTRACT_THUMBS).sort()).toEqual(["ayat", "kematian"]);
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