// robots.txt, sitemap.xml, llms.txt (_specs/70-PRD-seo.md §3.B) from the page registry.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { copy } from "@/landing/i18n";
import { DISALLOW, NAMED_BOTS, llmsTxt, robotsTxt, sitemapXml, whatIs } from "./files";
import { pageText } from "./metadata";
import { PAGES, type SeoPage } from "./routes";

/** robots.txt groups: agent → its rules. */
function groups(txt: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const block of txt.split(/\n\s*\n/)) {
    const lines = block.split("\n").filter((l) => l && !l.startsWith("#"));
    const agent = lines.find((l) => l.startsWith("User-agent:"))?.slice(11).trim();
    if (agent) out.set(agent, lines.filter((l) => !l.startsWith("User-agent:")));
  }
  return out;
}

describe("robots.txt", () => {
  const txt = robotsTxt();
  const g = groups(txt);

  it("everyone: allow all, but never /admin, /tv or /apk", () => {
    expect(g.get("*")).toEqual(["Allow: /", "Disallow: /admin", "Disallow: /tv", "Disallow: /apk"]);
  });

  it("each named search / AI crawler has its own Allow group that repeats the disallows", () => {
    expect(NAMED_BOTS).toEqual(["OAI-SearchBot", "ChatGPT-User", "GPTBot", "PerplexityBot", "ClaudeBot", "Claude-SearchBot", "Google-Extended", "Bingbot"]);
    for (const bot of NAMED_BOTS) {
      expect(g.get(bot), bot).toEqual(["Allow: /", ...DISALLOW.map((d) => `Disallow: ${d}`)]);
    }
  });

  it("ends with the sitemap line", () => {
    expect(txt.trim().split("\n").at(-1)).toBe("Sitemap: https://masjidview.my/sitemap.xml");
  });
});

describe("sitemap.xml", () => {
  const xml = sitemapXml();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

  it("lists every registered page once, absolute https with the trailing slash, and nothing else", () => {
    expect(locs).toEqual(PAGES.map((p) => `https://masjidview.my${p.path}`));
    for (const l of locs) {
      expect(l).toMatch(/^https:\/\/masjidview\.my\/(.*\/)?$/);
      expect(l).not.toMatch(/\/(admin|tv|apk)\//);
    }
  });

  it("lastmod = the page's content date", () => {
    const lastmods = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
    expect(lastmods).toEqual(PAGES.map((p) => p.updated));
  });

  it("hreflang ms / en / x-default only for pages with a translation", () => {
    const blocks = xml.split("<url>").slice(1);
    PAGES.forEach((p, i) => {
      const links = [...blocks[i].matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => `${m[1]}=${m[2]}`);
      if (!p.pair) return expect(links).toEqual([]);
      const ms = p.lang === "ms" ? p.path : p.pair;
      const en = p.lang === "en" ? p.path : p.pair;
      expect(links).toEqual([`ms=https://masjidview.my${ms}`, `en=https://masjidview.my${en}`, `x-default=https://masjidview.my${ms}`]);
    });
  });

  it("is well-formed: declared namespaces, escaped text", () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    const odd: SeoPage = { path: "/a&b/", lang: "ms", pair: null, titleKey: "meta.title", descriptionKey: "meta.description", updated: "2026-11-20", type: "legal" };
    expect(sitemapXml([odd])).toContain("<loc>https://masjidview.my/a&amp;b/</loc>");
  });
});

describe("llms.txt", () => {
  const txt = llmsTxt();

  it("title, one-line summary, BM then EN paragraph, then the page list", () => {
    const parts = txt.trim().split("\n\n");
    expect(parts[0]).toBe("# Masjid View");
    expect(parts[1]).toBe(`> ${copy("en").seo.summary}`);
    expect(parts[2]).toBe(whatIs("ms"));
    expect(parts[3]).toBe(whatIs("en"));
    expect(parts[4]).toBe("## Halaman utama");
  });

  it("links every non-article page with its own title and description", () => {
    for (const p of PAGES) {
      const { title, description } = pageText(p);
      expect(txt).toContain(`- [${title}](https://masjidview.my${p.path}): ${description}`);
    }
  });

  it("an Artikel list only once there are articles", () => {
    expect(txt).not.toContain("## Artikel");
    const art: SeoPage = { path: "/artikel/x/", lang: "ms", pair: null, titleKey: "meta.title", descriptionKey: "meta.description", updated: "2026-12-01", type: "article" };
    expect(llmsTxt([...PAGES, art])).toContain("## Artikel\n\n- [");
  });

  it("before S5 the paragraphs fall back to the meta description; once required, an empty whatIs fails", () => {
    for (const lang of ["ms", "en"] as const) {
      const body = copy(lang).whatIs.body.trim();
      if (body) expect(whatIs(lang)).toBe(body);
      else {
        expect(whatIs(lang, false)).toBe(copy(lang).meta.description);
        expect(() => whatIs(lang, true)).toThrow(/whatIs\.body is empty/);
      }
    }
  });
});

describe("one source", () => {
  it("there is no hand-written robots.txt / sitemap.xml / llms.txt tracked in public/", async () => {
    const { execSync } = await import("node:child_process");
    const tracked = execSync("git ls-files public/robots.txt public/sitemap.xml public/llms.txt", { encoding: "utf8" }).trim();
    expect(tracked).toBe("");
    expect(existsSync(join(process.cwd(), "scripts", "build-seo.ts"))).toBe(true);
  });
});
