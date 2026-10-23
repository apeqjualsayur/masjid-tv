import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// next/font only works inside a Next.js build.
vi.mock("./fonts", () => ({ outfit: { variable: "font-outfit-test" } }));
import { Guide } from "./Guide";
import { landingMetadata } from "./metadata";

describe("landing metadata", () => {
  const cases = [
    ["ms", "home", "/"],
    ["en", "home", "/en/"],
    ["ms", "panduan", "/panduan/"],
    ["en", "panduan", "/en/panduan/"],
  ] as const;
  for (const [lang, page, url] of cases) {
    it(`${url}: canonical, hreflang, Open Graph, Twitter card`, () => {
      const m = landingMetadata(lang, page);
      expect(m.alternates?.canonical).toBe(url);
      const other = page === "home" ? ["/", "/en/"] : ["/panduan/", "/en/panduan/"];
      expect(m.alternates?.languages).toEqual({ ms: other[0], en: other[1], "x-default": other[0] });
      expect(m.openGraph).toMatchObject({ url, images: [{ url: "/og.png", width: 1200, height: 630 }] });
      expect(m.twitter).toMatchObject({ card: "summary_large_image", images: ["/og.png"] });
      expect(m.title).toBeTruthy();
    });
  }
});

describe("/panduan", () => {
  it("screenshots that are not in public/panduan are left out; the text stays", () => {
    const html = renderToStaticMarkup(<Guide lang="ms" />);
    expect(html).toContain("Panduan pemasangan TV");
    expect(html).toContain("Pasangkan skrin dengan kod 6 digit");
    expect(html).not.toContain("/panduan/android-browser.png");
  });
});