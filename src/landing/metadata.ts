// Per-route metadata for /, /en, /panduan, /en/panduan: title, description, canonical + hreflang,
// Open Graph and Twitter card (public/og.png).
import type { Metadata, Viewport } from "next";
import { copy, pageHref, type Lang, type Page } from "./i18n";

export const SITE_URL = "https://masjidview.my";
export const OG_IMAGE = { url: "/og.png", width: 1200, height: 630 };

export function landingMetadata(lang: Lang, page: Page = "home"): Metadata {
  const c = copy(lang);
  const { title, description } = page === "panduan" ? c.panduan.meta : c.meta;
  const url = pageHref(lang, page);
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: {
      canonical: url,
      languages: { ms: pageHref("ms", page), en: pageHref("en", page), "x-default": pageHref("ms", page) },
    },
    openGraph: {
      type: "website",
      siteName: "Masjid View",
      url,
      title,
      description,
      locale: lang === "en" ? "en_MY" : "ms_MY",
      alternateLocale: lang === "en" ? "ms_MY" : "en_MY",
      images: [{ ...OG_IMAGE, alt: c.meta.title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE.url] },
  };
}

export const landingViewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ffffff" };