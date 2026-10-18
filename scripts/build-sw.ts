// After `next build`: writes out/sw.js from scripts/sw-template.js with the precache list
// (every file in out/) and a version hash of their contents.
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const OUT = join(process.cwd(), "out");
// Not app files: the worker itself and Cloudflare Pages control files.
const SKIP = new Set(["sw.js", "_headers", "_redirects"]);

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
  const files = walk(OUT).filter((f) => !SKIP.has(relative(OUT, f)) && !relative(OUT, f).startsWith("_not-found"));
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