// Template gallery (_specs/70-PRD-seo.md §3.F, S10).
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ARTICLES } from "@/content/artikel";
import { parseSlides } from "@/data/slides";
import { pageJsonLd } from "@/seo/jsonld";
import { PAGES } from "@/seo/routes";
import { PICKER_KEYS } from "@/templates";
import { GALLERY_FIELDS } from "@/landing/gallery-samples";
import { TEMPLATE_PAGES, templatePages, templatePath } from "./index";

vi.mock("@/landing/fonts", () => ({ outfit: { variable: "font-outfit-test" } }));

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const text = (html: string) => decode(html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const article = (html: string) => html.slice(html.indexOf("<article"), html.indexOf("</article>"));
async function render(key: (typeof PICKER_KEYS)[number]) {
  const { TemplatePage } = await import("@/landing/TemplatePage");
  return renderToStaticMarkup(<TemplatePage page={TEMPLATE_PAGES[key]} />);
}

describe("the gallery covers exactly the templates on offer", () => {
  it("one page per picker template, unique BM slugs, in picker order", () => {
    expect(templatePages().map((p) => p.key)).toEqual([...PICKER_KEYS]);
    const slugs = templatePages().map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(slugs).toEqual(["pengumuman-am", "kuliah-ceramah", "notis-kematian", "program", "kutipan-infaq", "mesyuarat", "penyata-kewangan", "ayat-hadith", "ucapan-perayaan", "penangguhan", "hari-kebesaran-islam", "jadual-imam-bilal"]);
  });

  it("a route folder for each page and no others; every page is in the registry", () => {
    const dir = join(process.cwd(), "src", "app", "(ms)", "templat");
    const folders = readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
    expect(folders.sort()).toEqual(templatePages().map((p) => p.slug).sort());
    const paths = PAGES.map((p) => p.path);
    expect(paths).toContain("/templat/");
    for (const p of templatePages()) expect(paths).toContain(templatePath(p.slug));
  });

  it("related templates and articles exist", () => {
    for (const p of templatePages()) {
      for (const r of p.relatedTemplates) expect(TEMPLATE_PAGES[r], `${p.slug} → ${r}`).toBeTruthy();
      for (const a of p.relatedArticles) expect(ARTICLES.some((x) => x.slug === a), `${p.slug} → ${a}`).toBe(true);
      expect(p.relatedTemplates).not.toContain(p.key);
    }
  });
});

describe.each(templatePages().map((p) => [p.slug, p.key] as const))("/templat/%s/", (slug, key) => {
  it("H1, answer-first intro of 40–60 words, 250–400 words on the page, the schema's fields", async () => {
    const p = TEMPLATE_PAGES[key];
    expect(p.h1.startsWith("Templat ")).toBe(true);
    expect(p.h1.endsWith("untuk skrin masjid")).toBe(true);
    expect(words(p.intro)).toBeGreaterThanOrEqual(40);
    expect(words(p.intro)).toBeLessThanOrEqual(60);
    const html = await render(key);
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    const n = words(text(article(html)));
    expect(n, `${slug}: ${n} words`).toBeGreaterThanOrEqual(250);
    expect(n, `${slug}: ${n} words`).toBeLessThanOrEqual(400);
    expect(html).toContain('href="/admin/"');
    expect(p.tips.length).toBeGreaterThanOrEqual(2);
    expect(p.tips.length).toBeLessThanOrEqual(3);
  });

  it("JSON-LD: Organization, WebSite, BreadcrumbList Utama › Templat › name", () => {
    const g = pageJsonLd(templatePath(slug))["@graph"] as { "@type": string; itemListElement?: { item: string }[] }[];
    expect(g.map((n) => n["@type"])).toEqual(["Organization", "WebSite", "BreadcrumbList"]);
    expect(g[2].itemListElement!.map((i) => i.item)).toEqual(["https://masjidview.my/", "https://masjidview.my/templat/", `https://masjidview.my/templat/${slug}/`]);
  });
});

describe("each page has its own text", () => {
  it("no sentence of 8+ words appears on two pages", () => {
    const seen = new Map<string, string>();
    for (const p of templatePages()) {
      const sentences = [p.intro, p.when, p.display, p.fieldsNote, ...p.tips].flatMap((s) => s.split(/(?<=[.!?;:])\s+/)).map((s) => s.trim().toLowerCase()).filter((s) => words(s) >= 8);
      for (const s of new Set(sentences)) {
        expect(seen.get(s), `"${s}" is on ${seen.get(s)} and ${p.slug}`).toBeUndefined();
        seen.set(s, p.slug);
      }
    }
  });

  it("titles and descriptions are unique", () => {
    const t = templatePages().map((p) => p.title);
    const d = templatePages().map((p) => p.description);
    expect(new Set(t).size).toBe(t.length);
    expect(new Set(d).size).toBe(d.length);
  });
});

describe("kematian: respectful, no accent colour, no real name", () => {
  it("the page body uses no brand accent colour and the sample is Fulan bin Fulan", async () => {
    const body = article(await render("kematian"));
    expect(body.replace(/outline-lb-[a-z]+/g, "")).not.toMatch(/lb-deep|lb-primary|lb-brand/);
    expect((GALLERY_FIELDS.kematian as { name: string }).name).toBe("Allahyarham Fulan bin Fulan");
  });
});

describe("render samples", () => {
  it("accepted by the TV and free of [ … ] placeholders", () => {
    for (const [k, fields] of Object.entries(GALLERY_FIELDS)) {
      const r = parseSlides([{ id: k, type: "template", template_key: k, fields: fields as Record<string, unknown> }]);
      expect(r.warnings, k).toEqual([]);
      const strings = (v: unknown): string[] => (typeof v === "string" ? [v] : v && typeof v === "object" ? Object.values(v).flatMap(strings) : []);
      for (const str of strings(fields)) expect(str, k).not.toMatch(/\[[^\]]*\]/);
    }
  });

  it("Ayat has no sample (layout only until the verse list is reviewed)", () => {
    expect(Object.keys(GALLERY_FIELDS)).not.toContain("ayat");
    expect(TEMPLATE_PAGES.ayat.render).toBe("layout");
  });
});

describe("gallery index and links", () => {
  it("/templat lists every template page", async () => {
    const { TemplatesGallery } = await import("@/landing/TemplatesGallery");
    const html = renderToStaticMarkup(<TemplatesGallery />);
    for (const p of templatePages()) expect(html).toContain(`href="${templatePath(p.slug)}"`);
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
  });

  it("the home Templat section and the footer link to /templat", async () => {
    const { Landing } = await import("@/landing/Landing");
    const html = renderToStaticMarkup(<Landing lang="ms" />);
    const section = html.slice(html.indexOf('id="templat"'), html.indexOf('id="cuba"'));
    expect(section).toContain('href="/templat/"');
    expect(html.slice(html.indexOf("<footer")).includes('href="/templat/"')).toBe(true);
  });
});
