// The public page registry (_specs/70-PRD-seo.md §3.B): every page search engines may index, with its
// language, its translation (if any), where its title and description live in the landing i18n files,
// and the date it last changed (sitemap lastmod, S4). One entry per URL; nothing else lists routes.
// Not here: /tv, /admin, /apk (never indexed).
import { UPDATED as PRIVACY_UPDATED } from "@/content/privasi";
import type { Lang } from "@/landing/i18n";

export type PageType = "home" | "guide" | "about" | "article" | "template" | "legal";

export interface SeoPage {
  /** Served path with the trailing slash (static export). */
  path: string;
  lang: Lang;
  /** The same page in the other language, or null when there is no translation (no hreflang then). */
  pair: string | null;
  /** Dotted keys in src/landing/i18n/{ms,en}.json. */
  titleKey: string;
  descriptionKey: string;
  /** YYYY-MM-DD the page content last changed (from its content where it has one). */
  updated: string;
  type: PageType;
}

/** The landing pages and the guide were last refreshed in this round. */
const LANDING_UPDATED = "2026-11-20";

export const PAGES: readonly SeoPage[] = [
  { path: "/", lang: "ms", pair: "/en/", titleKey: "meta.title", descriptionKey: "meta.description", updated: LANDING_UPDATED, type: "home" },
  { path: "/en/", lang: "en", pair: "/", titleKey: "meta.title", descriptionKey: "meta.description", updated: LANDING_UPDATED, type: "home" },
  { path: "/panduan/", lang: "ms", pair: "/en/panduan/", titleKey: "panduan.meta.title", descriptionKey: "panduan.meta.description", updated: LANDING_UPDATED, type: "guide" },
  { path: "/en/panduan/", lang: "en", pair: "/panduan/", titleKey: "panduan.meta.title", descriptionKey: "panduan.meta.description", updated: LANDING_UPDATED, type: "guide" },
  { path: "/tentang/", lang: "ms", pair: "/en/tentang/", titleKey: "tentang.meta.title", descriptionKey: "tentang.meta.description", updated: LANDING_UPDATED, type: "about" },
  { path: "/en/tentang/", lang: "en", pair: "/tentang/", titleKey: "tentang.meta.title", descriptionKey: "tentang.meta.description", updated: LANDING_UPDATED, type: "about" },
  { path: "/privasi/", lang: "ms", pair: "/en/privasi/", titleKey: "privasi.meta.title", descriptionKey: "privasi.meta.description", updated: PRIVACY_UPDATED, type: "legal" },
  { path: "/en/privasi/", lang: "en", pair: "/privasi/", titleKey: "privasi.meta.title", descriptionKey: "privasi.meta.description", updated: PRIVACY_UPDATED, type: "legal" },
];

/** The registry entry for a path; a public page that is not registered is a bug, so this throws. */
export function seoPage(path: string): SeoPage {
  const p = PAGES.find((x) => x.path === path);
  if (!p) throw new Error(`Not in the SEO page registry (src/seo/routes.ts): ${path}`);
  return p;
}

/** The page in each language: { ms, en } for a pair, or just its own language. */
export function languageVersions(p: SeoPage): Partial<Record<Lang, string>> {
  const out: Partial<Record<Lang, string>> = { [p.lang]: p.path };
  if (p.pair) out[seoPage(p.pair).lang] = p.pair;
  return out;
}
