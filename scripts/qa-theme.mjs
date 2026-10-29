// Screenshots of one theme for visual QA (round-2 themes, _specs/41-themes-round2-prompts.md T4–T7).
//   npm run build && npm run qa:theme -- falak
// Serves out/ on 127.0.0.1 (debug params allowed on localhost) and drives the installed Chrome through
// playwright-core (no `playwright install`). Writes 1920×1080 PNGs to designs/qa/<theme>/ (git-ignored):
// 5 phases × 4 layouts, the 5 mode screens, the Friday strip, Kematian, showArabic off and lite=1.
// Set CHROME_PATH if Chrome is not in a standard location.
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { chromium } from "playwright-core";

const THEME = process.argv[2];
if (!THEME) {
  console.error("Usage: npm run qa:theme -- <theme id>");
  process.exit(2);
}
const ROOT = process.cwd();
const OUT = join(ROOT, "out");
const SHOTS = join(ROOT, "designs", "qa", THEME);
const PORT = 4323;
const BASE = `http://127.0.0.1:${PORT}`;
const DAY = "2026-10-29"; // Thursday
const FRI = "2026-10-30";
const PHASES = { subuh: "06:40", zohor: "14:30", asar: "17:00", maghrib: "19:30", isyak: "22:00" };

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

const screenJson = JSON.parse(readFileSync(join(OUT, "config", "screen.json"), "utf8"));
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, serviceWorkers: "block" });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

let n = 0;
async function shot(name, query, { showArabic = true } = {}) {
  await page.unroute("**/config/screen.json").catch(() => {});
  if (!showArabic) await page.route("**/config/screen.json", (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ ...screenJson, showArabic: false }) }));
  await page.goto(`${BASE}/tv/?local=1&theme=${THEME}&${query}`);
  await page.waitForSelector("[data-stage]", { timeout: 15_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200); // theme chunk, cross-fade, images
  await page.screenshot({ path: join(SHOTS, `${name}.png`) });
  n++;
  process.stdout.write(".");
}

for (const [phase, time] of Object.entries(PHASES)) {
  const sim = `sim=${DAY}T${time}`;
  await shot(`${phase}-full`, `${sim}&layout=full`);
  await shot(`${phase}-bottom`, `${sim}&layout=bottom&slide=pengumuman`);
  await shot(`${phase}-side`, `${sim}&layout=side&slide=kewangan`);
  await shot(`${phase}-poster`, `${sim}&layout=poster&slide=kuliah`);
}
const midday = `sim=${DAY}T14:30`;
for (const mode of ["pre_azan", "azan", "iqamah", "solat"]) await shot(`mode-${mode}`, `${midday}&layout=full&mode=${mode}`);
await shot("mode-khutbah", `sim=${FRI}T13:20&layout=full&mode=khutbah`);
for (const layout of ["full", "bottom", "side"]) await shot(`friday-${layout}`, `sim=${FRI}T10:00&layout=${layout}&slide=program`);
for (const layout of ["bottom", "side", "poster"]) await shot(`kematian-${layout}`, `${midday}&layout=${layout}&slide=kematian`);
await shot("arabic-off-full", `${midday}&layout=full`, { showArabic: false });
await shot("arabic-off-azan", `${midday}&layout=full&mode=azan`, { showArabic: false });
await shot("arabic-off-iqamah", `${midday}&layout=full&mode=iqamah`, { showArabic: false });
await shot("lite-full", `${midday}&layout=full&lite=1`);
await shot("lite-bottom", `${midday}&layout=bottom&slide=ayat&lite=1`);
await shot("lite-iqamah", `${midday}&layout=full&mode=iqamah&lite=1`);

// Closing the system Chrome can hang on Windows; don't let it keep the script alive.
await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 5000))]);
server.closeAllConnections();
server.close();
console.log(`\n${n} screenshots in designs/qa/${THEME}/${errors.length ? `\nPage errors:\n- ${[...new Set(errors)].join("\n- ")}` : ""}`);
process.exit(errors.length ? 1 : 0);
