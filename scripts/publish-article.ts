// Publish a draft article: remove `draft: true`, set datePublished and dateModified to today (Malaysia),
// and create its route folder src/app/(ms)/artikel/<slug>/page.tsx. The registry, sitemap, llms.txt,
// RSS feed and /artikel pick it up on the next build.
//   npm run publish-article -- ramadan-2027-tarikh-jangkaan
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SLUG, publishContent, routePage, todayMy } from "../src/content/artikel/scaffold";

const slug = process.argv[2] ?? "";
if (!SLUG.test(slug)) {
  console.error("Usage: npm run publish-article -- <slug>");
  process.exit(2);
}
const file = join(process.cwd(), "src", "content", "artikel", `${slug}.ts`);
if (!existsSync(file)) {
  console.error(`No article ${slug} (src/content/artikel/${slug}.ts). Create it with npm run new-article -- ${slug}`);
  process.exit(1);
}
const today = todayMy();
writeFileSync(file, publishContent(readFileSync(file, "utf8"), today));
const routeDir = join(process.cwd(), "src", "app", "(ms)", "artikel", slug);
mkdirSync(routeDir, { recursive: true });
writeFileSync(join(routeDir, "page.tsx"), routePage(slug));
console.log(`Published /artikel/${slug}/ (dated ${today}). Run npm test and npm run build, then push.`);
