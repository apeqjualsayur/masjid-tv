// Writes public/robots.txt, public/sitemap.xml and public/llms.txt from the page registry (src/seo/).
// Run before `next build` (npm run build) and `next dev`; the files are git-ignored (one source).
//   npx tsx scripts/build-seo.ts
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { llmsTxt, robotsTxt, sitemapXml } from "../src/seo/files";
import { PAGES } from "../src/seo/routes";

const PUBLIC = join(process.cwd(), "public");
const files: [string, string][] = [
  ["robots.txt", robotsTxt()],
  ["sitemap.xml", sitemapXml()],
  ["llms.txt", llmsTxt()],
];
for (const [name, body] of files) writeFileSync(join(PUBLIC, name), body);
console.log(`SEO files: ${files.map(([n]) => n).join(", ")} (${PAGES.length} pages)`);
