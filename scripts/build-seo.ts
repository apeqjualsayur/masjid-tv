// Writes public/robots.txt, public/sitemap.xml, public/llms.txt and public/artikel/feed.xml from the page
// registry and the published articles (src/seo/, src/content/artikel/).
// Run before `next build` (npm run build) and `next dev`; the files are git-ignored (one source).
//   npx tsx scripts/build-seo.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { llmsTxt, robotsTxt, rssXml, sitemapXml } from "../src/seo/files";
import { PAGES } from "../src/seo/routes";

const PUBLIC = join(process.cwd(), "public");
const files: [string, string][] = [
  ["robots.txt", robotsTxt()],
  ["sitemap.xml", sitemapXml()],
  ["llms.txt", llmsTxt()],
  ["artikel/feed.xml", rssXml()],
];
mkdirSync(join(PUBLIC, "artikel"), { recursive: true });
for (const [name, body] of files) writeFileSync(join(PUBLIC, name), body);
console.log(`SEO files: ${files.map(([n]) => n).join(", ")} (${PAGES.length} pages)`);
