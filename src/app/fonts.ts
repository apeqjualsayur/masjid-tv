// All theme fonts, self-hosted by next/font at build time (no runtime request to Google),
// so the display keeps working offline. Themes refer to these via the CSS variables below.
// Not preloaded (except Plus Jakarta Sans, the admin font): these are in the root layout of every
// page, and preloading ~550 KB of theme fonts slowed the landing page, which shows the themes only
// below the fold. The browser still fetches each font as soon as a page uses it, and the TV's
// service worker precaches every font file, so a paired TV reads them from its cache.
import {
  Amiri,
  Barlow,
  Barlow_Condensed,
  Manrope,
  Noto_Naskh_Arabic,
  Plus_Jakarta_Sans,
  Reem_Kufi,
} from "next/font/google";

// alam
export const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta-sans",
  display: "block",
});

// alam + tenang (Arabic prayer names)
export const notoNaskhArabic = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600"],
  variable: "--font-noto-naskh-arabic",
  display: "block",
  preload: false,
});

// serambi
export const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow",
  display: "block",
  preload: false,
});

export const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-barlow-condensed",
  display: "block",
  preload: false,
});

export const reemKufi = Reem_Kufi({
  subsets: ["arabic", "latin"],
  weight: ["500", "600"],
  variable: "--font-reem-kufi",
  display: "block",
  preload: false,
});

export const amiri = Amiri({
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  variable: "--font-amiri",
  display: "block",
  preload: false,
});

// tenang
export const manrope = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "block",
  preload: false,
});

export const fontVariables = [
  plusJakartaSans,
  notoNaskhArabic,
  barlow,
  barlowCondensed,
  reemKufi,
  amiri,
  manrope,
]
  .map((f) => f.variable)
  .join(" ");
