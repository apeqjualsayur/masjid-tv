// Text the article scripts write (scripts/new-article.ts, scripts/publish-article.ts). Pure, tested.

export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** "ramadan-2027-tarikh-jangkaan" → "ramadan2027TarikhJangkaan" (the import name in index.ts). */
export const slugToIdent = (slug: string) => {
  const id = slug.replace(/-([a-z0-9])/g, (_m, c: string) => c.toUpperCase());
  return /^[0-9]/.test(id) ? `a${id}` : id;
};

/** Today in Malaysia (UTC+8) as YYYY-MM-DD. */
export const todayMy = (now = Date.now()) => new Date(now + 8 * 3600_000).toISOString().slice(0, 10);

/** A new draft content module. */
export function articleTemplate(slug: string, today: string): string {
  return `// /artikel/${slug}/ — DRAFT until \`npm run publish-article ${slug}\`. Block shapes: ./types.ts (example: ./contoh-artikel.ts).
import type { Article } from "./types";

const article: Article = {
  slug: "${slug}",
  lang: "ms",
  title: "TODO tajuk artikel",
  seoTitle: "TODO tajuk SEO",
  description: "TODO 120–155 aksara.",
  datePublished: "${today}",
  dateModified: "${today}",
  summary: "TODO jawapan ringkas, 40–60 patah perkataan.",
  blocks: [{ type: "paragraph", text: "TODO" }],
  related: [],
  draft: true,
};

export default article;
`;
}

/** index.ts with the new module imported and listed (alphabetical import block, appended to ARTICLES). */
export function addToIndex(index: string, slug: string): string {
  const ident = slugToIdent(slug);
  if (index.includes(`from "./${slug}"`)) throw new Error(`${slug} is already in index.ts`);
  const importLine = `import ${ident} from "./${slug}";`;
  const imports = [...index.matchAll(/^import [a-zA-Z0-9]+ from "\.\/[a-z0-9-]+";$/gm)];
  if (!imports.length) throw new Error("index.ts: no article imports found");
  const lastImport = imports[imports.length - 1];
  const afterImport = lastImport.index! + lastImport[0].length;
  let out = `${index.slice(0, afterImport)}\n${importLine}${index.slice(afterImport)}`;
  const close = out.indexOf("\n];", out.indexOf("export const ARTICLES"));
  if (close < 0) throw new Error("index.ts: ARTICLES list not found");
  out = `${out.slice(0, close)}\n  ${ident},${out.slice(close)}`;
  return out;
}

/** The content module made live: no draft flag, published and modified today. */
export function publishContent(src: string, today: string): string {
  if (!/\n\s*draft: true,\n/.test(src)) throw new Error("not a draft (no `draft: true,` line)");
  return src
    .replace(/\n\s*draft: true,\n/, "\n")
    .replace(/datePublished: "\d{4}-\d{2}-\d{2}"/, `datePublished: "${today}"`)
    .replace(/dateModified: "\d{4}-\d{2}-\d{2}"/, `dateModified: "${today}"`)
    .replace(/^\/\/ \/artikel\/([a-z0-9-]+)\/ — DRAFT until [^\n]*/, "// /artikel/$1/ — published. Block shapes: ./types.ts.");
}

/** src/app/(ms)/artikel/<slug>/page.tsx: the route folder of a published article (no [slug] segment). */
export function routePage(slug: string): string {
  return `// /artikel/${slug}/ — created by \`npm run publish-article ${slug}\`. Content: src/content/artikel/${slug}.ts.
import article from "@/content/artikel/${slug}";
import { ArticlePage } from "@/landing/ArticlePage";
import { landingViewport } from "@/landing/metadata";
import { buildMetadata } from "@/seo/metadata";

export const metadata = buildMetadata("/artikel/${slug}/");
export const viewport = landingViewport;

export default function Page() {
  return <ArticlePage article={article} />;
}
`;
}
