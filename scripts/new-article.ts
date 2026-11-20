// New draft article: src/content/artikel/<slug>.ts (draft: true) + its entry in index.ts. A draft is
// never built, listed, fed or indexed; publish it with `npm run publish-article <slug>`.
//   npm run new-article -- ramadan-2027-tarikh-jangkaan
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SLUG, addToIndex, articleTemplate, todayMy } from "../src/content/artikel/scaffold";

const slug = process.argv[2] ?? "";
if (!SLUG.test(slug)) {
  console.error("Usage: npm run new-article -- <slug>   (a-z, 0-9 and hyphens, e.g. ramadan-2027-tarikh-jangkaan)");
  process.exit(2);
}
const dir = join(process.cwd(), "src", "content", "artikel");
const file = join(dir, `${slug}.ts`);
if (existsSync(file)) {
  console.error(`${file} already exists.`);
  process.exit(1);
}
const indexFile = join(dir, "index.ts");
const index = addToIndex(readFileSync(indexFile, "utf8"), slug);
writeFileSync(file, articleTemplate(slug, todayMy()));
writeFileSync(indexFile, index);
console.log(`Draft created: src/content/artikel/${slug}.ts (listed in index.ts). Publish with: npm run publish-article -- ${slug}`);
