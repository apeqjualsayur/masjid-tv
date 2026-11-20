// buildMetadata(path): the <head> of every public page (_specs/70-PRD-seo.md §3.B) from the registry and
// the landing i18n text: title, description, self-canonical, hreflang ms/en/x-default (only for a page
// with a translation; x-default = the BM page), Open Graph and Twitter card.
import type { Metadata } from "next";
import { t } from "@/landing/i18n";
import { languageVersions, seoPage, type SeoPage } from "./routes";
import { FEED_PATH, SITE } from "./site";

/** The page's title and description in its own language. */
export function pageText(p: SeoPage): { title: string; description: string } {
  return { title: p.title ?? t(p.lang, p.titleKey ?? ""), description: p.description ?? t(p.lang, p.descriptionKey ?? "") };
}

/** hreflang alternates for a page with a translation, or undefined. */
export function hreflang(p: SeoPage): Record<string, string> | undefined {
  if (!p.pair) return undefined;
  const v = languageVersions(p);
  return { ms: v.ms!, en: v.en!, "x-default": v.ms! };
}

export function buildMetadata(path: string): Metadata {
  const p = seoPage(path);
  const { title, description } = pageText(p);
  const languages = hreflang(p);
  const pair = p.pair ? seoPage(p.pair) : null;
  const locale = (l: string) => (l === "en" ? "en_MY" : "ms_MY");
  return {
    metadataBase: new URL(SITE.url),
    title: { absolute: title },
    description,
    alternates: {
      canonical: p.path,
      ...(languages ? { languages } : {}),
      // The articles feed is announced on the hub (PRD §3.B "Feed").
      ...(p.type === "hub" ? { types: { "application/rss+xml": [{ url: FEED_PATH, title: `${SITE.brand} · Artikel` }] } } : {}),
    },
    openGraph: {
      type: p.type === "article" ? "article" : "website",
      siteName: SITE.brand,
      url: p.path,
      title,
      description,
      locale: locale(p.lang),
      ...(pair ? { alternateLocale: locale(pair.lang) } : {}),
      images: [{ ...SITE.ogImage, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [SITE.ogImage.url] },
  };
}
