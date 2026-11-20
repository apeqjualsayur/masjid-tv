// Article content (_specs/70-PRD-seo.md §3.E): typed blocks, no markdown library. Text fields may use two
// inline marks only: **bold** and [label](/path) links (relative for this site, https:// for others).
// BM only at launch (decision D3).

export type ArticleBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "ordered"; items: string[] }
  | { type: "table"; head: string[]; rows: string[][]; caption?: string }
  | { type: "faq"; items: { q: string; a: string }[] }
  | { type: "callout"; text: string }
  | { type: "cta"; links: { label: string; href: string }[] };

export interface Article {
  /** URL segment: /artikel/<slug>/ (a-z, 0-9, hyphens). */
  slug: string;
  lang: "ms";
  /** The H1. */
  title: string;
  /** <title> before " · Masjid View" (the brand is added when it still fits in 60 characters). */
  seoTitle: string;
  /** Meta description, 120–155 characters. */
  description: string;
  /** YYYY-MM-DD */
  datePublished: string;
  dateModified: string;
  /** "Jawapan ringkas": the direct answer, 40–60 words. */
  summary: string;
  blocks: ArticleBlock[];
  /** Other article slugs to link at the end (drafts are left out when rendering). */
  related: string[];
  /** Site path of the share image; default /og.png. */
  image?: string;
  /** A draft is never built, listed, fed or indexed (no route folder until `npm run publish-article`). */
  draft?: true;
}
