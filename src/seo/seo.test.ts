// SEO head rules (_specs/70-PRD-seo.md §3.B, §6.1): every public page has its own title (≤ 60) and
// description (120–155) in its language, a self-canonical, and hreflang only with a translation that
// points back.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildMetadata, hreflang, pageText } from "./metadata";
import { PAGES, seoPage } from "./routes";
import { DESCRIPTION_MAX, DESCRIPTION_MIN, SITE, TITLE_MAX } from "./site";

const len = (s: string) => [...s].length;

describe("page registry", () => {
  it("paths are unique, absolute and end with a slash", () => {
    const paths = PAGES.map((p) => p.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const p of paths) expect(p).toMatch(/^\/([a-z0-9-]+\/)*$/);
  });

  it("never lists the TV, admin or APK pages", () => {
    for (const p of PAGES) expect(p.path).not.toMatch(/^\/(en\/)?(tv|admin|apk)\//);
  });

  it("English pages live under /en/, BM pages do not", () => {
    for (const p of PAGES) expect(p.path.startsWith("/en/")).toBe(p.lang === "en");
  });

  it("every page has a route file in src/app", () => {
    for (const p of PAGES) {
      const group = p.lang === "en" ? "(en)" : "(ms)";
      expect(existsSync(join(process.cwd(), "src", "app", group, p.path, "page.tsx")), p.path).toBe(true);
    }
  });

  it("every pair points back to its partner, in the other language", () => {
    for (const p of PAGES) {
      if (!p.pair) continue;
      const other = seoPage(p.pair);
      expect(other.pair, p.path).toBe(p.path);
      expect(other.lang).not.toBe(p.lang);
      expect(other.type).toBe(p.type);
    }
  });

  it("updated dates are real YYYY-MM-DD dates", () => {
    for (const p of PAGES) expect(Number.isNaN(Date.parse(`${p.updated}T00:00:00Z`)), p.path).toBe(false);
  });

  it("an unregistered path throws", () => {
    expect(() => seoPage("/tiada/")).toThrow(/registry/);
  });
});

describe("titles and descriptions", () => {
  it(`title ≤ ${TITLE_MAX} and description ${DESCRIPTION_MIN}–${DESCRIPTION_MAX} characters, in the page's language`, () => {
    for (const p of PAGES) {
      const { title, description } = pageText(p);
      expect(title, `${p.path} title missing`).not.toBe(p.titleKey);
      expect(description, `${p.path} description missing`).not.toBe(p.descriptionKey);
      expect(len(title), `${p.path}: "${title}"`).toBeLessThanOrEqual(TITLE_MAX);
      expect(len(description), `${p.path}: "${description}"`).toBeGreaterThanOrEqual(DESCRIPTION_MIN);
      expect(len(description), `${p.path}: "${description}"`).toBeLessThanOrEqual(DESCRIPTION_MAX);
      // Articles keep the brand only when it fits (articleTitle); every other page ends with it.
      if (p.type !== "article") expect(title.endsWith(` · ${SITE.brand}`), p.path).toBe(true);
    }
  });

  it("no two pages share a title or a description", () => {
    const titles = PAGES.map((p) => pageText(p).title);
    const descriptions = PAGES.map((p) => pageText(p).description);
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  it("a pair is not the same text in two languages", () => {
    for (const p of PAGES) if (p.pair) expect(pageText(p).title).not.toBe(pageText(seoPage(p.pair)).title);
  });
});

describe("buildMetadata", () => {
  it("self-canonical; hreflang ms / en / x-default (→ BM) only for a page with a translation", () => {
    for (const p of PAGES) {
      const m = buildMetadata(p.path);
      expect(m.alternates?.canonical).toBe(p.path);
      expect(m.title).toEqual({ absolute: pageText(p).title });
      expect(m.description).toBe(pageText(p).description);
      if (p.pair) {
        const ms = p.lang === "ms" ? p.path : p.pair;
        const en = p.lang === "en" ? p.path : p.pair;
        expect(m.alternates?.languages).toEqual({ ms, en, "x-default": ms });
      } else {
        expect(m.alternates?.languages).toBeUndefined();
        expect(hreflang(p)).toBeUndefined();
      }
      expect(m.openGraph).toMatchObject({ url: p.path, locale: p.lang === "en" ? "en_MY" : "ms_MY", images: [{ url: SITE.ogImage.url }] });
    }
  });

  it("/privasi is the privacy notice, not the old 'Masjid TV' title", () => {
    expect(buildMetadata("/privasi/").title).toEqual({ absolute: "Notis Privasi · Masjid View" });
    expect(buildMetadata("/en/privasi/").title).toEqual({ absolute: "Privacy Notice · Masjid View" });
  });
});
