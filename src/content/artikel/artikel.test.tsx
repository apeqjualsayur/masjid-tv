// Articles hub (_specs/70-PRD-seo.md §3.E, S8): drafts never ship; published articles meet the rules.
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { pageJsonLd } from "@/seo/jsonld";
import { llmsTxt, rssXml, sitemapXml } from "@/seo/files";
import { PAGES, articlePages, articleTitle } from "@/seo/routes";
import contoh from "./contoh-artikel";
import { ARTICLES, articlePath, publishedArticles, type Article } from "./index";
import { SLUG, addToIndex, articleTemplate, publishContent, routePage, slugToIdent } from "./scaffold";
import { links, plain } from "./text";

vi.mock("@/landing/fonts", () => ({ outfit: { variable: "font-outfit-test" } }));
// The layout test renders an unregistered sample article; its JSON-LD is tested through pageJsonLd.
vi.mock("@/landing/jsonld", () => ({ JsonLd: () => null, jsonForScript: (v: unknown) => JSON.stringify(v) }));

const words = (s: string) => plain(s).trim().split(/\s+/).length;
const ROUTES_DIR = join(process.cwd(), "src", "app", "(ms)", "artikel");
const routeFolders = () => readdirSync(ROUTES_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
/** The sample, as if it were published (for checks that need one). */
const live: Article = (() => {
  const { draft: _draft, ...rest } = contoh;
  return { ...rest, slug: "contoh-terbit" };
})();

describe("drafts never ship", () => {
  const drafts = ARTICLES.filter((a) => a.draft);

  it("the sample article is a draft", () => {
    expect(contoh.draft).toBe(true);
    expect(drafts.map((a) => a.slug)).toContain("contoh-artikel");
  });

  it("not in the registry, sitemap, llms.txt or RSS feed", () => {
    const sitemap = sitemapXml();
    const llms = llmsTxt();
    const feed = rssXml();
    for (const d of drafts) {
      const path = articlePath(d.slug);
      expect(PAGES.map((p) => p.path), d.slug).not.toContain(path);
      expect(sitemap, d.slug).not.toContain(path);
      expect(llms, d.slug).not.toContain(path);
      expect(feed, d.slug).not.toContain(path);
    }
  });

  it("not on the /artikel index; the index shows the empty state when nothing is published", async () => {
    const { ArticlesIndex } = await import("@/landing/ArticlesIndex");
    const html = renderToStaticMarkup(<ArticlesIndex />);
    for (const d of drafts) expect(html).not.toContain(articlePath(d.slug));
    if (publishedArticles().length === 0) expect(html).toContain("data-empty");
  });

  it("a route folder exists exactly for each published article (so a draft never builds into out/)", () => {
    expect(routeFolders().sort()).toEqual(publishedArticles().map((a) => a.slug).sort());
    for (const d of drafts) expect(existsSync(join(ROUTES_DIR, d.slug))).toBe(false);
  });
});

describe("every published article", () => {
  for (const a of publishedArticles()) {
    it(`${a.slug}: summary 40–60 words, description 120–155 chars, title ≤ 60, valid links`, () => {
      expect(SLUG.test(a.slug)).toBe(true);
      expect(words(a.summary)).toBeGreaterThanOrEqual(40);
      expect(words(a.summary)).toBeLessThanOrEqual(60);
      expect([...a.description].length).toBeGreaterThanOrEqual(120);
      expect([...a.description].length).toBeLessThanOrEqual(155);
      expect([...articleTitle(a)].length).toBeLessThanOrEqual(60);
      expect(a.dateModified >= a.datePublished).toBe(true);
      for (const r of a.related) expect(ARTICLES.some((x) => x.slug === r), r).toBe(true);
      const texts = a.blocks.flatMap((b) => ("text" in b ? [b.text] : "items" in b ? b.items.map((i) => (typeof i === "string" ? i : `${i.q} ${i.a}`)) : "rows" in b ? b.rows.flat() : []));
      for (const href of texts.flatMap(links)) expect(href, href).toMatch(/^(\/[^\s]*|https:\/\/\S+)$/);
    });
  }

  it("the published list is newest first", () => {
    const d = publishedArticles().map((a) => a.datePublished);
    expect(d).toEqual([...d].sort().reverse());
  });
});

describe("wording rules (PRD 70 §2.3, S9): every real article, drafts included", () => {
  const real = ARTICLES.filter((a) => a.slug !== "contoh-artikel");
  /** Every piece of prose in an article: summary, description and blocks (tables separately). */
  const prose = (a: Article) => [a.title, a.description, a.summary, ...a.blocks.flatMap((b) => ("text" in b ? [b.text] : b.type === "list" || b.type === "ordered" ? b.items : b.type === "faq" ? b.items.flatMap((i) => [i.q, i.a]) : []))].map(plain);
  const sentences = (s: string) => s.split(/(?<=[.!?])\s+/);
  const RAMADAN_SEASON_DATE = /\b\d{1,2}(?:[–-]\d{1,2})? (?:Februari|Mac)\b/;

  it("there are real articles to check", () => expect(real.length).toBeGreaterThanOrEqual(3));

  for (const a of real) {
    it(`${a.slug}: JAKIM only as "data e-Solat JAKIM" / "zon JAKIM"`, () => {
      const all = [...prose(a), ...a.blocks.flatMap((b) => (b.type === "table" ? [...b.head, ...b.rows.flat(), b.caption ?? ""] : []))].join(" ");
      expect(all.replace(/data e-Solat JAKIM|zon JAKIM/g, "").includes("JAKIM")).toBe(false);
    });

    it(`${a.slug}: every Ramadan-season date is labelled jangkaan / dijangka`, () => {
      for (const s of prose(a).flatMap(sentences)) if (RAMADAN_SEASON_DATE.test(s)) expect(s, s).toMatch(/jangka/i);
      for (const b of a.blocks) {
        if (b.type !== "table" || !b.rows.flat().some((c) => RAMADAN_SEASON_DATE.test(c))) continue;
        expect([...b.head, b.caption ?? ""].join(" "), "table header").toMatch(/jangkaan/i);
      }
    });
  }
});

describe("a published article in the registry, feed and JSON-LD", () => {
  it("registry entry: path, lang ms, no pair, own title and description, lastmod = dateModified", () => {
    const [p] = articlePages([live]);
    expect(p).toMatchObject({ path: "/artikel/contoh-terbit/", lang: "ms", pair: null, title: articleTitle(live), description: live.description, updated: live.dateModified, type: "article" });
  });

  it("the brand is added to the title only when it fits in 60 characters", () => {
    expect(articleTitle({ seoTitle: "Pendek" })).toBe("Pendek · Masjid View");
    const long = "Cara Pasang Skrin Waktu Solat di TV Masjid & Surau";
    expect(articleTitle({ seoTitle: long })).toBe(long);
  });

  it("RSS 2.0: channel, self link, one item with link, guid, pubDate, summary", () => {
    const feed = rssXml([live]);
    expect(feed).toContain('<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">');
    expect(feed).toContain('<atom:link href="https://masjidview.my/artikel/feed.xml" rel="self" type="application/rss+xml"/>');
    expect(feed.match(/<item>/g)).toHaveLength(1);
    expect(feed).toContain("<link>https://masjidview.my/artikel/contoh-terbit/</link>");
    expect(feed).toContain('<guid isPermaLink="true">https://masjidview.my/artikel/contoh-terbit/</guid>');
    expect(feed).toContain("<pubDate>Fri, 20 Nov 2026 00:00:00 +0800</pubDate>");
    expect(rssXml([])).not.toContain("<item>");
  });

  it("an empty feed is still a valid channel", () => {
    expect(rssXml([])).toMatch(/<channel>[\s\S]*<title>Masjid View · Artikel<\/title>[\s\S]*<\/channel>/);
  });

  it("JSON-LD for the hub: Organization, WebSite, BreadcrumbList", () => {
    expect((pageJsonLd("/artikel/")["@graph"] as { "@type": string }[]).map((n) => n["@type"])).toEqual(["Organization", "WebSite", "BreadcrumbList"]);
  });
});

describe("article page", () => {
  it("breadcrumb, one H1, dates in BM, author, Jawapan ringkas, FAQ, CTA, no draft related links", async () => {
    const { ArticlePage } = await import("@/landing/ArticlePage");
    const html = renderToStaticMarkup(<ArticlePage article={{ ...live, related: ["contoh-artikel"] }} />);
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(html).toMatch(/Utama[\s\S]*›[\s\S]*Artikel[\s\S]*›[\s\S]*Contoh artikel/);
    expect(html).toContain('<time dateTime="2026-11-20">20 November 2026</time>');
    expect(html).toContain("Pasukan Masjid View");
    expect(html).toContain("Jawapan ringkas");
    expect(html).toContain("<details");
    expect(html).toContain('href="/tv/?demo=1"');
    expect(html).toContain('href="/admin/"');
    expect(html).not.toContain(articlePath("contoh-artikel")); // the related draft is left out
    expect(html).toContain("<strong>teks tebal</strong>");
    expect(html).toContain('href="/panduan/"');
  });
});

describe("scaffolding (npm run new-article / publish-article)", () => {
  it("slug rules and import names", () => {
    expect(SLUG.test("ramadan-2027-tarikh-jangkaan")).toBe(true);
    expect(SLUG.test("Ramadan 2027")).toBe(false);
    expect(slugToIdent("ramadan-2027-tarikh-jangkaan")).toBe("ramadan2027TarikhJangkaan");
    expect(slugToIdent("2027-x")).toBe("a2027X");
  });

  it("a new article is a draft and is added to the index", () => {
    expect(articleTemplate("x-y", "2026-12-01")).toContain("draft: true,");
    const idx = addToIndex(`import contohArtikel from "./contoh-artikel";\nimport type { Article } from "./types";\n\nexport const ARTICLES: readonly Article[] = [\n  contohArtikel,\n];\n`, "x-y");
    expect(idx).toContain('import contohArtikel from "./contoh-artikel";\nimport xY from "./x-y";');
    expect(idx).toContain("  contohArtikel,\n  xY,\n];");
    expect(() => addToIndex(idx, "x-y")).toThrow(/already/);
  });

  it("publishing removes the draft flag, dates it today and writes the route page", () => {
    const pub = publishContent(articleTemplate("x-y", "2026-12-01"), "2026-12-05");
    expect(pub).not.toContain("draft:");
    expect(pub).toContain('datePublished: "2026-12-05"');
    expect(pub).toContain('dateModified: "2026-12-05"');
    expect(() => publishContent(pub, "2026-12-06")).toThrow(/not a draft/);
    const page = routePage("x-y");
    expect(page).toContain('import article from "@/content/artikel/x-y";');
    expect(page).toContain('buildMetadata("/artikel/x-y/")');
  });
});
