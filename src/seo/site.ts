// Site-wide facts for search engines and sharing (_specs/70-PRD-seo.md §3.B). The only place they live.
export const SITE = {
  url: "https://masjidview.my",
  brand: "Masjid View",
  /** Open Graph / Twitter image (1200×630, public/og.png). */
  ogImage: { url: "/og.png", width: 1200, height: 630 },
} as const;

/** Title length limit and description range (PRD §3.B). */
export const TITLE_MAX = 60;
export const DESCRIPTION_MIN = 120;
export const DESCRIPTION_MAX = 155;
