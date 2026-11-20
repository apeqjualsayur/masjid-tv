// Viewport for the public pages. Titles, descriptions, canonical and hreflang: src/seo/metadata.ts.
import type { Viewport } from "next";
import { SITE } from "@/seo/site";

/** Kept for the landing JSON-LD until S3 moves it to src/seo. */
export const SITE_URL = SITE.url;

export const landingViewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ffffff" };
