// Per-route metadata for / and /en (title and description from the copy; canonical + hreflang).
import type { Metadata, Viewport } from "next";
import { copy, homeHref, type Lang } from "./i18n";

export const SITE_URL = "https://masjidview.my";

export function landingMetadata(lang: Lang): Metadata {
  const c = copy(lang);
  return {
    metadataBase: new URL(SITE_URL),
    title: c.meta.title,
    description: c.meta.description,
    alternates: {
      canonical: homeHref(lang),
      languages: { ms: "/", en: "/en/", "x-default": "/" },
    },
  };
}

export const landingViewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ffffff" };