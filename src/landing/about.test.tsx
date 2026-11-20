// /tentang (_specs/70-PRD-seo.md §3.D, S7).
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { pageJsonLd } from "@/seo/jsonld";
import { copy } from "./i18n";
import { site } from "./site";

vi.mock("./fonts", () => ({ outfit: { variable: "font-outfit-test" } }));

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const text = (html: string) => decode(html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
const words = (s: string) => s.trim().split(/\s+/).length;

async function about(lang: "ms" | "en") {
  const { About } = await import("./About");
  return renderToStaticMarkup(<About lang={lang} />);
}
const article = (html: string) => html.slice(html.indexOf("<article"), html.indexOf("</article>"));

describe.each(["ms", "en"] as const)("%s about page", (lang) => {
  it("250–400 words of its own copy, one H1", async () => {
    const html = await about(lang);
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    const n = words(text(article(html)));
    expect(n).toBeGreaterThanOrEqual(250);
    expect(n).toBeLessThanOrEqual(400);
  });

  it("covers what, why, who (D1: brand only, Hamba Allah, Kuala Lumpur), funding, prayer-time source, privacy, contact", async () => {
    const t = text(article(await about(lang)));
    const k = copy(lang).tentang;
    for (const s of k.sections) expect(t, s.id).toContain(s.heading);
    expect(t).toContain(site.credit);
    expect(t).toContain("Kuala Lumpur");
    expect(t).toContain(lang === "ms" ? "data e-Solat JAKIM" : "JAKIM e-Solat data");
    expect(t).toContain(k.contact.heading);
  });

  it("JAKIM only as e-Solat data (no implied endorsement); Ramadan dates are expected", async () => {
    const t = text(article(await about(lang)));
    expect(t.replace(/(e-Solat JAKIM|JAKIM e-Solat)/g, "").includes("JAKIM")).toBe(false);
    expect(t).toContain(lang === "ms" ? "jangkaan" : "expected");
  });

  it("links: privacy notice in the same language, contact e-mail", async () => {
    const html = article(await about(lang));
    expect(html).toContain(`href="${lang === "en" ? "/en/privasi/" : "/privasi/"}"`);
    expect(html).toContain(`href="mailto:${site.contactEmail}"`);
  });

  it("footer has the Tentang link; social links only when set in site.ts", async () => {
    const html = await about(lang);
    const footer = html.slice(html.indexOf("<footer"));
    expect(footer).toContain(`href="${lang === "en" ? "/en/tentang/" : "/tentang/"}"`);
    expect(footer).toContain(`>${copy(lang).footer.helpAbout}<`);
    const before = { fb: site.facebookUrl, yt: site.youtubeUrl };
    try {
      site.facebookUrl = "";
      site.youtubeUrl = "";
      const none = await about(lang);
      expect(none).not.toContain("facebook.com");
      expect(none).not.toContain("youtube.com");
      site.youtubeUrl = "https://www.youtube.com/@example";
      const withYt = await about(lang);
      expect(withYt.match(/href="https:\/\/www\.youtube\.com\/@example"/g)?.length).toBe(2); // contact + footer
      expect(withYt).not.toContain("facebook.com");
    } finally {
      site.facebookUrl = before.fb;
      site.youtubeUrl = before.yt;
    }
    // The real Facebook page (site.ts) shows on the About page and in the footer.
    if (site.facebookUrl) expect(html.split(`href="${site.facebookUrl}"`).length - 1).toBe(2);
  });

  it("JSON-LD: Organization, WebSite, AboutPage, BreadcrumbList (Utama/Home → Tentang)", () => {
    const path = lang === "en" ? "/en/tentang/" : "/tentang/";
    const g = pageJsonLd(path)["@graph"] as Record<string, unknown>[];
    expect(g.map((n) => n["@type"])).toEqual(["Organization", "WebSite", "AboutPage", "BreadcrumbList"]);
    const crumbs = (g[3].itemListElement as { name: string; item: string }[]).map((i) => i.name);
    expect(crumbs).toEqual([copy(lang).seo.breadcrumbHome, copy(lang).tentang.title]);
  });
});
