import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// next/font only works inside a Next.js build.
vi.mock("./fonts", () => ({ outfit: { variable: "font-outfit-test" } }));
import { Guide } from "./Guide";
import { buildMetadata } from "@/seo/metadata";

describe("landing metadata", () => {
  const cases = [
    ["home", "/"],
    ["home", "/en/"],
    ["panduan", "/panduan/"],
    ["panduan", "/en/panduan/"],
  ] as const;
  for (const [page, url] of cases) {
    it(`${url}: canonical, hreflang, Open Graph, Twitter card`, () => {
      const m = buildMetadata(url);
      expect(m.alternates?.canonical).toBe(url);
      const other = page === "home" ? ["/", "/en/"] : ["/panduan/", "/en/panduan/"];
      expect(m.alternates?.languages).toEqual({ ms: other[0], en: other[1], "x-default": other[0] });
      expect(m.openGraph).toMatchObject({ url, images: [{ url: "/og.png", width: 1200, height: 630 }] });
      expect(m.twitter).toMatchObject({ card: "summary_large_image", images: ["/og.png"] });
      expect(m.title).toBeTruthy();
    });
  }
});

describe("anchors, alt text and spacing (PRD 70 §3.B)", () => {
  const text = (html: string) => html.replace(/<[^>]+>/g, "");
  for (const lang of ["ms", "en"] as const) {
    it(`${lang}: every header nav anchor has its section on the home page`, async () => {
      const { Landing } = await import("./Landing");
      const { NAV } = await import("./Header");
      const html = renderToStaticMarkup(<Landing lang={lang} />);
      for (const n of NAV) expect(html, n.id).toContain(` id="${n.id}"`);
    });
    it(`${lang}: guide headings keep a space between the number and the title ("1 TV…", never "1TV…")`, () => {
      const html = renderToStaticMarkup(<Guide lang={lang} />);
      const headings = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => text(m[1]));
      expect(headings.filter((h) => /^\d/.test(h)).length).toBeGreaterThan(5);
      for (const h of headings) expect(h, h).not.toMatch(/^\d+\S/);
    });
    it(`${lang}: header lockup and app icon have alt text`, async () => {
      const { Landing } = await import("./Landing");
      const html = renderToStaticMarkup(<Landing lang={lang} />);
      expect(html).toMatch(/src="\/brand\/mv-lockup.svg" alt="Masjid View"/);
      expect(html).toMatch(/src="\/brand\/mv-app-icon.svg" alt="[^"]+"/);
      expect(html).toMatch(/src="\/brand\/mv-mark.svg" alt="[^"]+"/);
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