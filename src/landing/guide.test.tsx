// /panduan refresh (_specs/70-PRD-seo.md §3.C, S6): the Android TV app section from the admin card's
// strings, labels as the TV app shows them, an answer-first line per section, the updated date.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import adminEn from "@/admin/i18n/en.json";
import adminMs from "@/admin/i18n/ms.json";
import { seoPage } from "@/seo/routes";
import { APK_LINK, guideSections } from "./guide-content";
import { copy } from "./i18n";

vi.mock("./fonts", () => ({ outfit: { variable: "font-outfit-test" } }));

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"');
/** The TV app's own on-screen strings (android-tv/app/src/main/res/values/strings.xml). */
const tvString = (name: string) => {
  const xml = readFileSync(join(process.cwd(), "android-tv", "app", "src", "main", "res", "values", "strings.xml"), "utf8");
  const v = new RegExp(`<string name="${name}">([^<]*)</string>`).exec(xml)?.[1];
  if (v === undefined) throw new Error(`no TV string ${name}`);
  return v.replace(/\\"/g, '"');
};

describe.each(["ms", "en"] as const)("%s guide", (lang) => {
  const card = (lang === "en" ? adminEn : adminMs).screens.app;
  const sections = guideSections(lang);

  it("the app section comes first; its install steps are the admin card's strings", () => {
    const app = sections[0];
    expect(app.id).toBe("aplikasi");
    expect(app.steps.slice(0, 4)).toEqual([card.step1, card.step2, card.step3.replace("{link}", APK_LINK), card.step4]);
    expect(app.steps.join(" ")).not.toContain("{link}");
    expect(app.lead).toBe(card.why);
    expect(app.note).toBe(card.kiosk);
    expect(sections.slice(1).map((s) => s.id)).toEqual(copy(lang).panduan.sections.map((s) => s.id));
  });

  it("the TV app's labels are quoted exactly as the TV shows them", () => {
    const text = sections.flatMap((s) => [s.lead, ...s.steps]).join(" ");
    for (const name of ["settings_autostart", "settings_update", "update_title", "update_yes", "settings_title"]) {
      expect(text, name).toContain(tvString(name));
    }
    expect(text).toContain("Paparan di atas apl lain");
  });

  it("every section opens with its one-sentence lead, right after the heading", async () => {
    const { Guide } = await import("./Guide");
    const html = renderToStaticMarkup(<Guide lang={lang} />);
    for (const s of [...sections, { id: copy(lang).panduan.trouble.id, lead: copy(lang).panduan.trouble.lead }]) {
      expect(s.lead.length, s.id).toBeGreaterThan(20);
      const at = html.indexOf(`id="${s.id}"`);
      const afterHeading = html.slice(html.indexOf("</h2>", at), html.indexOf("</h2>", at) + 400);
      expect(decode(afterHeading), s.id).toContain(s.lead);
    }
  });

  it('"Dikemas kini" under the H1 is the registry date; "In this guide" is a real heading', async () => {
    const { Guide } = await import("./Guide");
    const html = renderToStaticMarkup(<Guide lang={lang} />);
    const updated = seoPage(lang === "en" ? "/en/panduan/" : "/panduan/").updated;
    const h1 = html.indexOf("</h1>");
    expect(html.slice(h1, h1 + 300)).toContain(`<time dateTime="${updated}">`);
    expect(html.slice(h1, h1 + 300)).toContain(copy(lang).panduan.updated);
    expect(html).toMatch(new RegExp(`<h2 id="panduan-toc"[^>]*>${copy(lang).panduan.toc}</h2>`));
  });

  it("no step still says the browser needs OK for sound or that Fully Kiosk is best overall", () => {
    const text = sections.flatMap((s) => s.steps).join(" ");
    expect(text).not.toMatch(/Cara terbaik untuk TV Android|Best for Android TV/);
  });
});
