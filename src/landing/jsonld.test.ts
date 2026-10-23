import { describe, expect, it } from "vitest";
import { copy } from "./i18n";
import { jsonForScript, landingJsonLd } from "./jsonld";

describe("landing JSON-LD", () => {
  for (const lang of ["ms", "en"] as const) {
    it(`${lang}: free web app + FAQPage from the same FAQ copy`, () => {
      const [app, faq] = landingJsonLd(lang) as [Record<string, unknown>, { mainEntity: { name: string; acceptedAnswer: { text: string } }[] }];
      expect(app).toMatchObject({ "@type": "SoftwareApplication", name: "Masjid View", operatingSystem: "Web", offers: { price: "0", priceCurrency: "MYR" } });
      expect(app).not.toHaveProperty("aggregateRating");
      const items = copy(lang).faq.items;
      expect(faq.mainEntity).toHaveLength(items.length);
      expect(faq.mainEntity.map((q) => q.name)).toEqual(items.map((i) => i.q));
      expect(faq.mainEntity[0].acceptedAnswer.text).toBe(items[0].a);
    });
  }
  it("text can never close the <script> tag", () => {
    expect(jsonForScript({ a: "</script><b>" })).not.toContain("<");
  });
});