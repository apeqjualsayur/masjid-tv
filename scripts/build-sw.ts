// After `next build`: writes out/sw.js from scripts/sw-template.js with the precache list
// (every file in out/) and a version hash of their contents.
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const OUT = join(process.cwd(), "out");
// Not app files: the worker itself and Cloudflare Pages control files. version.json must always come
// from the network (it says whether a newer version is live), so it is not precached. The sounds
// folder's README is a note for the owner, not an app file. Everything else in out/sounds/ is precached.
// robots.txt, sitemap.xml, llms.txt: for crawlers only, never used by a TV (and a new sitemap date must
// not make every TV update its service worker).
const SKIP = new Set(["sw.js", "_headers", "_redirects", "version.json", "sounds/README.md", "robots.txt", "sitemap.xml", "llms.txt"]);
// The Android TV app download (apk/, published by .github/workflows/android-tv.yml): never precached
// (a TV must not download a 2 MB APK it never uses) and not in the version hash (a new APK must not
// make every TV update its service worker).
// email/: pictures for announcement e-mails (linked from the e-mail, never used by a TV).
const SKIP_DIRS = ["apk/", "email/"];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

/** out/tv/index.html -> /tv/ ; out/config/screen.json -> /config/screen.json */
export function toUrl(file: string): string {
  const rel = relative(OUT, file).split(sep).join("/");
  if (rel === "index.html") return "/";
  if (rel.endsWith("/index.html")) return "/" + rel.slice(0, -"index.html".length);
  return "/" + rel;
}

function main() {
  const rel = (f: string) => relative(OUT, f).split(sep).join("/");
  const files = walk(OUT).filter((f) => !SKIP.has(rel(f)) && !rel(f).startsWith("_not-found") && !SKIP_DIRS.some((d) => rel(f).startsWith(d)));
  const hash = createHash("sha256");
  const urls: string[] = [];
  for (const f of files.sort()) {
    const url = toUrl(f);
    urls.push(url);
    hash.update(url).update(readFileSync(f));
  }
  const version = hash.digest("hex").slice(0, 12);
  const template = readFileSync(join(process.cwd(), "scripts", "sw-template.js"), "utf8");
  const sw = template.replace('"__VERSION__"', JSON.stringify(version)).replace("__PRECACHE__", JSON.stringify(urls, null, 0));
  writeFileSync(join(OUT, "sw.js"), sw);
  console.log(`out/sw.js: version ${version}, ${urls.length} files precached`);
}

main();