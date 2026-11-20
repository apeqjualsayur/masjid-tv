// Structured data (_specs/70-PRD-seo.md §3.B): builders, one @graph per page, same facts as the page.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { copy } from "@/landing/i18n";
import { fill } from "@/landing/counts";
import { guideSections } from "@/landing/guide-content";
import { site } from "@/landing/site";
import { article, breadcrumbList, faqPage, graph, howTo, organization, pageJsonLd, softwareApplication, website } from "./jsonld";
import { PAGES, seoPage } from "./routes";

vi.mock("@/landing/fonts", () => ({ outfit: { variable: "font-outfit-test" } }));

type N = Record<string, unknown>;
const nodes = (path: string) => (pageJsonLd(path)["@graph"] as N[]);
const types = (path: string) => nodes(path).map((n) => n["@type"]);
const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");

/** Every leaf value in a JSON tree. */
function leaves(v: unknown, out: unknown[] = []): unknown[] {
  if (Array.isArray(v)) v.forEach((x) => leaves(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => leaves(x, out));
  else out.push(v);
  return out;
}

describe("builders", () => {
  it("Organization: name, url, raster logo, contact e-mail; no ratings or counts", () => {
    const o = graph([organization()])["@graph"] as N[];
    expect(o[0]).toMatchObject({ "@type": "Organization", name: "Masjid View", url: "https://masjidview.my/", logo: { url: "https://masjidview.my/apple-touch-icon.png", width: 180 }, email: site.contactEmail, contactPoint: { email: site.contactEmail } });
    expect(JSON.stringify(o)).not.toMatch(/aggregateRating|review|ratingValue|userInteractionCount/);
  });

  it("Organization.sameAs only lists the profiles that are set", () => {
    expect((graph([organization()])["@graph"] as N[])[0]).not.toHaveProperty("sameAs");
    const before = site.facebookUrl;
    site.facebookUrl = "https://www.facebook.com/masjidview";
    try {
      expect((graph([organization()])["@graph"] as N[])[0].sameAs).toEqual(["https://www.facebook.com/masjidview"]);
    } finally {
      site.facebookUrl = before;
    }
  });

  it("WebSite per language, published by the Organization", () => {
    expect(website("en")).toMatchObject({ "@type": "WebSite", url: "https://masjidview.my/en/", inLanguage: "en", publisher: { "@id": "https://masjidview.my/#organization" } });
  });

  it("SoftwareApplication: free, browser + Android TV, /apk, features from the feature cards, og.png", () => {
    for (const lang of ["ms", "en"] as const) {
      expect(softwareApplication(lang)).toMatchObject({
        "@type": "SoftwareApplication",
        operatingSystem: "Web browser, Android TV",
        applicationCategory: "LifestyleApplication",
        offers: { "@type": "Offer", price: "0", priceCurrency: "MYR" },
        downloadUrl: "https://masjidview.my/apk",
        featureList: copy(lang).features.items.map((f) => fill(f.t)),
        screenshot: "https://masjidview.my/og.png",
        description: copy(lang).meta.description,
      });
    }
  });

  it("FAQPage, HowTo, BreadcrumbList, Article shapes", () => {
    expect(faqPage("ms", [{ q: "Q?", a: "A." }])).toEqual({ "@type": "FAQPage", inLanguage: "ms", mainEntity: [{ "@type": "Question", name: "Q?", acceptedAnswer: { "@type": "Answer", text: "A." } }] });
    expect(howTo("ms", "N", "D", [{ title: "S1", steps: ["a", "b"] }]).step).toEqual([
      { "@type": "HowToSection", name: "S1", itemListElement: [{ "@type": "HowToStep", position: 1, text: "a" }, { "@type": "HowToStep", position: 2, text: "b" }] },
    ]);
    expect(breadcrumbList([{ name: "Utama", path: "/" }, { name: "Panduan", path: "/panduan/" }]).itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Utama", item: "https://masjidview.my/" },
      { "@type": "ListItem", position: 2, name: "Panduan", item: "https://masjidview.my/panduan/" },
    ]);
    expect(article({ path: "/artikel/x/", lang: "ms", headline: "H", description: "D", datePublished: "2026-12-01", dateModified: "2026-12-02" })).toMatchObject({
      "@type": "Article", headline: "H", datePublished: "2026-12-01", dateModified: "2026-12-02", image: "https://masjidview.my/og.png", author: { "@id": "https://masjidview.my/#organization" },
    });
  });

  it("graph() drops empty values instead of emitting them", () => {
    expect(graph([{ "@type": "Thing", a: "", b: undefined, c: [], d: null, e: { f: "" }, g: "ok" }])).toEqual({ "@context": "https://schema.org", "@graph": [{ "@type": "Thing", g: "ok" }] });
  });
});

describe("per page (PRD §3.B table)", () => {
  it("every page: Organization + WebSite; home + SoftwareApplication + FAQPage; guide + HowTo + BreadcrumbList", () => {
    for (const p of PAGES) {
      const t = types(p.path);
      expect(t.slice(0, 2), p.path).toEqual(["Organization", "WebSite"]);
      if (p.type === "home") expect(t).toEqual(["Organization", "WebSite", "SoftwareApplication", "FAQPage"]);
      if (p.type === "guide") expect(t).toEqual(["Organization", "WebSite", "HowTo", "BreadcrumbList"]);
      if (p.type === "legal") expect(t).toEqual(["Organization", "WebSite"]);
    }
  });

  it("no page's JSON-LD has an empty string, null or undefined; every URL is absolute https", () => {
    for (const p of PAGES) {
      const doc = pageJsonLd(p.path);
      expect(doc["@context"]).toBe("https://schema.org");
      for (const v of leaves(doc)) {
        expect(v, p.path).not.toBe("");
        expect(v, p.path).not.toBeNull();
        expect(v, p.path).not.toBeUndefined();
      }
      for (const n of doc["@graph"] as N[]) if (typeof n.url === "string") expect(n.url).toMatch(/^https:\/\/masjidview\.my\//);
    }
  });

  it("the guide's HowTo has the guide's own sections and steps; breadcrumb Utama → guide", () => {
    for (const path of ["/panduan/", "/en/panduan/"]) {
      const g = { sections: guideSections(seoPage(path).lang) };
      const [, , how, crumbs] = nodes(path);
      expect((how.step as N[]).map((s) => s.name)).toEqual(g.sections.map((s) => s.title));
      expect(((how.step as N[])[0].itemListElement as N[]).map((s) => s.text)).toEqual(g.sections[0].steps);
      expect((crumbs.itemListElement as N[]).map((i) => i.item)).toEqual([`https://masjidview.my${path.startsWith("/en/") ? "/en/" : "/"}`, `https://masjidview.my${path}`]);
    }
  });
});

describe("rendered pages", () => {
  for (const lang of ["ms", "en"] as const) {
    it(`${lang} home: one JSON-LD script, and its FAQPage asks exactly the questions shown on the page`, async () => {
      const { Landing } = await import("@/landing/Landing");
      const html = renderToStaticMarkup(<Landing lang={lang} />);
      const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
      expect(scripts).toHaveLength(1);
      const doc = JSON.parse(scripts[0][1]) as { "@graph": N[] };
      const faq = doc["@graph"].find((n) => n["@type"] === "FAQPage")!;
      // The question is the summary's first <span>; the second is the decorative "+" icon (aria-hidden).
      const shown = [...html.matchAll(/<summary[^>]*><span>([\s\S]*?)<\/span>/g)].map((m) => decode(m[1]).trim());
      expect(shown.length).toBeGreaterThan(5);
      expect((faq.mainEntity as N[]).map((q) => q.name)).toEqual(shown);
    });

    it(`${lang} guide and privacy notice: one JSON-LD script each`, async () => {
      const { Guide } = await import("@/landing/Guide");
      const { PrivacyNotice } = await import("@/landing/PrivacyNotice");
      for (const html of [renderToStaticMarkup(<Guide lang={lang} />), renderToStaticMarkup(<PrivacyNotice lang={lang} />)]) {
        expect(html.match(/application\/ld\+json/g)).toHaveLength(1);
      }
    });
  }
});
