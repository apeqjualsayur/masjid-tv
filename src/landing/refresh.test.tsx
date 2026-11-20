// Home page refresh for the enhancements (_specs/70-PRD-seo.md §3.C, S5).
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PICKER_KEYS } from "@/templates";
import { TEMPLATES } from "@/templates/schema";
import { TEMPLATE_COUNT } from "./counts";
import { copy, type Lang } from "./i18n";

vi.mock("./fonts", () => ({ outfit: { variable: "font-outfit-test" } }));

const words = (s: string) => s.trim().split(/\s+/).length;
const text = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ");
async function home(lang: Lang) {
  const { Landing } = await import("./Landing");
  return renderToStaticMarkup(<Landing lang={lang} />);
}

describe.each(["ms", "en"] as const)("%s home page", (lang) => {
  it("the template count and list come from src/templates (the picker's templates)", async () => {
    expect(TEMPLATE_COUNT).toBe(PICKER_KEYS.length);
    expect(TEMPLATE_COUNT).toBe(12);
    const html = await home(lang);
    const t = text(html);
    expect(t).toContain(`${TEMPLATE_COUNT} ${lang === "ms" ? "templat siap" : "ready-made templates"}`);
    const section = html.slice(html.indexOf('id="templat"'), html.indexOf('id="cuba"'));
    const names = [...section.matchAll(/<h3[^>]*>([^<]+)<\/h3>/g)].map((m) => m[1].replace(/&amp;/g, "&"));
    expect(names).toEqual(PICKER_KEYS.map((k) => TEMPLATES[k].name[lang]));
    expect(names).not.toContain(TEMPLATES.imam_bilal.name[lang] === TEMPLATES.jadual_petugas.name[lang] ? "-" : TEMPLATES.imam_bilal.name[lang]);
  });

  it('"Apakah Masjid View?" right after the hero: 40–60 words, definition style, e-Solat linked', async () => {
    const w = copy(lang).whatIs;
    expect(words(w.body)).toBeGreaterThanOrEqual(40);
    expect(words(w.body)).toBeLessThanOrEqual(60);
    expect(w.body.startsWith(lang === "ms" ? "Masjid View ialah " : "Masjid View is ")).toBe(true);
    const { SECTIONS } = await import("./Landing");
    expect(SECTIONS.slice(0, 2)).toEqual(["hero", "apakah"]);
    const html = await home(lang);
    const link = html.match(/<a href="https:\/\/www\.e-solat\.gov\.my"[^>]*>/)?.[0] ?? "";
    expect(link).toContain('target="_blank"');
    expect(link).toContain('rel="nofollow noopener"');
    // The linked mention is the first mention of e-Solat in the page body.
    const body = html.slice(html.indexOf("<main")).replace(/<script[\s\S]*?<\/script>/g, ""); // visible content only
    expect(body.indexOf(w.linkText)).toBeGreaterThan(body.indexOf('href="https://www.e-solat.gov.my"'));
  });

  it("FAQ: at most 14 questions, every answer 25–60 words, the new questions are there", () => {
    const items = copy(lang).faq.items;
    expect(items.length).toBeLessThanOrEqual(14);
    for (const it of items) {
      expect(words(it.a), it.q).toBeGreaterThanOrEqual(lang === "ms" ? 10 : 10);
      expect(words(it.a), it.q).toBeLessThanOrEqual(60);
    }
    // The rewritten app answer and the 4 new questions (PRD §3.C) are 25–60 words.
    for (const it of items.slice(2, 7)) expect(words(it.a), it.q).toBeGreaterThanOrEqual(25);
    const qs = items.map((i) => i.q).join(" | ");
    for (const k of lang === "ms" ? ["Android TV", "imam dan bilal", "ditangguhkan", "Ramadan"] : ["Android TV", "imam and bilal", "postponed", "Ramadan"]) expect(qs).toContain(k);
  });

  it("text check: nothing says there is no app or 10 templates; JAKIM only as e-Solat JAKIM / zon JAKIM", async () => {
    const t = text(await home(lang));
    for (const bad of [/tiada aplikasi/i, /\b10 templat/i, /\b10 templates/i, /no (masjid view |special )?app\b/i]) expect(t, String(bad)).not.toMatch(bad);
    const allowed = /(e-Solat JAKIM|zon JAKIM|JAKIM e-Solat|JAKIM zone)/gi;
    expect(t.replace(allowed, "").includes("JAKIM"), t.match(/.{30}JAKIM.{30}/g)?.join(" | ")).toBe(false);
    expect(t.toLowerCase()).not.toContain("takwim jakim");
  });
});
