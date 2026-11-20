// Every article module, drafts included (scripts/new-article.ts adds the import and the list entry).
// Pages, the SEO registry, the sitemap, llms.txt and the RSS feed use publishedArticles() only.
import contohArtikel from "./contoh-artikel";
import type { Article } from "./types";

export type { Article, ArticleBlock } from "./types";

export const ARTICLES: readonly Article[] = [
  contohArtikel,
];

export const articlePath = (slug: string) => `/artikel/${slug}/`;

/** Published articles, newest first (by datePublished, then dateModified). */
export function publishedArticles(all: readonly Article[] = ARTICLES): Article[] {
  return all
    .filter((a) => !a.draft)
    .slice()
    .sort((a, b) => b.datePublished.localeCompare(a.datePublished) || b.dateModified.localeCompare(a.dateModified));
}

export function articleBySlug(slug: string, all: readonly Article[] = ARTICLES): Article | undefined {
  return all.find((a) => a.slug === slug);
}
