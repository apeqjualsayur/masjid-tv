// Screenshots of the announcement-only `poster` layout (contract rules 14–18) for visual QA.
//   npm run build && npm run qa:poster
// Serves out/ on 127.0.0.1 (debug params allowed on localhost) and drives the installed Chrome through
// playwright-core (no `playwright install`). Writes 1920×1080 PNGs to designs/qa/poster/ (git-ignored):
// 3 themes × 10 templates, 3 empty states, and an image poster (landscape + portrait) per theme.
// Set CHROME_PATH if Chrome is not in a standard location.
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { chromium } from "playwright-core";

const ROOT = process.cwd();
const OUT = join(ROOT, "out");
const SHOTS = join(ROOT, "designs", "qa", "poster");
const PORT = 4322;
const BASE = `http://127.0.0.1:${PORT}`;
const THEMES = ["tenang", "serambi", "alam"];
const TEMPLATES = ["kuliah", "program", "ayat", "pengumuman", "kewangan", "kematian", "infaq", "imam_bilal", "mesyuarat", "ucapan"];
const SIM = "2026-10-17T10:00"; // a calm morning (Zohor phase colours later in the day are covered by the unit tests)

const CHROME =
  process.env.CHROME_PATH ||
  ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"].find((p) => existsSync(p));
if (!existsSync(join(OUT, "tv", "index.html"))) {
  console.error("out/ not found. Run `npm run build` first.");
  process.exit(2);
}
if (!CHROME) {
  console.error("Chrome not found. Set CHROME_PATH.");
  process.exit(2);
}
mkdirSync(SHOTS, { recursive: true });

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp" };
const server = createServer((req, res) => {
  let f = join(OUT, decodeURIComponent(new URL(req.url, BASE).pathname));
  try { if (statSync(f).isDirectory()) f = join(f, "index.html"); } catch {}
  try {
    const body = readFileSync(f);
    res.writeHead(200, { "content-type": TYPES[extname(f)] || "application/octet-stream", "cache-control": "no-cache" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
});
await new Promise((r) => server.listen(PORT, "127.0.0.1", r));

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, serviceWorkers: "block" });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

async function shot(name, query, { noSlides = false } = {}) {
  await page.unroute("**/config/sample-slides.json").catch(() => {});
  if (noSlides) await page.route("**/config/sample-slides.json", (r) => r.fulfill({ contentType: "application/json", body: "[]" }));
  await page.goto(`${BASE}/tv/?local=1&layout=poster&sim=${SIM}&${query}`);
  await page.waitForSelector(noSlides ? "[data-empty]" : "[data-poster-area]", { timeout: 15_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900); // cross-fade + images
  await page.screenshot({ path: join(SHOTS, `${name}.png`) });
  process.stdout.write(".");
}

let n = 0;
for (const theme of THEMES) {
  for (const key of TEMPLATES) {
    await shot(`${theme}-${key}`, `theme=${theme}&slide=${key}`);
    n++;
  }
  await shot(`${theme}-empty`, `theme=${theme}`, { noSlides: true });
  await shot(`${theme}-poster-landscape`, `theme=${theme}&slide=poster-landscape`);
  await shot(`${theme}-poster-portrait`, `theme=${theme}&slide=poster`);
  n += 3;
}

// Closing the system Chrome can hang on Windows; don't let it keep the script alive.
await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 5000))]);
server.closeAllConnections();
server.close();
console.log(`\n${n} screenshots in designs/qa/poster/${errors.length ? `\nPage errors:\n- ${[...new Set(errors)].join("\n- ")}` : ""}`);
process.exit(errors.length ? 1 : 0);
