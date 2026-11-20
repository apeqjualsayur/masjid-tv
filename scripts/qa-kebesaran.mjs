// Screenshots of the Hari Kebesaran slide (PRD enhancements §5.4) for visual QA.
//   npm run build && npm run qa:kebesaran
// Serves out/ on 127.0.0.1 and drives the installed Chrome (playwright-core, no `playwright install`).
// Local mode uses the SAMPLE takwim dated around today (src/templates/samples.ts), so each state is a
// ?sim= day offset. Writes 1920×1080 PNGs to designs/qa/kebesaran/ (git-ignored): 7 themes × 3 areas
// × (countdown, Esok, Malam ini, Ramadan, greeting Aidilfitri, greeting Aidiladha), and fails when the
// slide text overflows its area. The sim dates must have bundled prayer data (public/data/).
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { chromium } from "playwright-core";

const ROOT = process.cwd();
const OUT = join(ROOT, "out");
const SHOTS = join(ROOT, "designs", "qa", "kebesaran");
const PORT = 4324;
const BASE = `http://127.0.0.1:${PORT}`;
const THEMES = ["tenang", "serambi", "alam", "falak", "garis", "kerawang", "seterusnya"];
const LAYOUTS = ["bottom", "side", "poster"];

/** Malaysia "today" + n days, at hh:mm. */
const dayAt = (n, hhmm) => new Date(Date.now() + 8 * 3600_000 + n * 86_400_000).toISOString().slice(0, 10) + "T" + hhmm;
// Offsets: src/templates/samples.ts SAMPLE_TAKWIM_OFFSETS.
const STATES = {
  countdown: dayAt(0, "10:00"), // Israk dan Mikraj in 3 days
  esok: dayAt(5, "10:00"), // Nisfu Syaaban tomorrow
  "malam-ini": dayAt(5, "21:30"), // after Maghrib on its eve
  ramadan: dayAt(20, "10:00"), // Ramadan day 12
  "greeting-aidilfitri": dayAt(38, "10:00"),
  "greeting-aidiladha": dayAt(41, "10:00"),
};
const SLIDE = [{ id: "hk", type: "template", template_key: "hari_kebesaran", status: "active", fields: {} }];

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
  let body;
  try { body = readFileSync(f); } catch { res.writeHead(404); res.end("not found"); return; }
  res.writeHead(200, { "content-type": TYPES[extname(f)] || "application/octet-stream", "cache-control": "no-cache" });
  res.end(body);
});
await new Promise((r) => server.listen(PORT, "127.0.0.1", r));

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--enable-features=NetworkServiceInProcess,NetworkServiceInProcess2", "--disable-features=NetworkServiceSandbox"],
});
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, serviceWorkers: "block" });
const page = await context.newPage();
await page.route("**/config/sample-slides.json", (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify(SLIDE) }));
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

const problems = [];
let n = 0;
for (const theme of THEMES) {
  for (const layout of LAYOUTS) {
    for (const [state, sim] of Object.entries(STATES)) {
      const name = `${theme}-${layout}-${state}`;
      await page.goto(`${BASE}/tv/?local=1&theme=${theme}&layout=${layout}&sim=${sim}`);
      try {
        await page.waitForSelector("[data-kebesaran]", { timeout: 15_000 });
      } catch {
        problems.push(`${name}: the slide did not show (sim ${sim})`);
        continue;
      }
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(900);
      const over = await page.evaluate(() => {
        const area = document.querySelector("[data-poster-area]").getBoundingClientRect();
        const out = [];
        for (const el of document.querySelectorAll("[data-kebesaran] *")) {
          const b = el.getBoundingClientRect();
          if (b.width === 0 || b.height === 0) continue;
          if (b.bottom > area.bottom + 1 || b.right > area.right + 1 || b.left < area.left - 1 || b.top < area.top - 1) out.push((el.textContent || el.tagName).trim().slice(0, 40));
          if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== "visible") out.push(`clipped: ${(el.textContent || "").trim().slice(0, 40)}`);
        }
        return [...new Set(out)].slice(0, 4);
      });
      if (over.length) problems.push(`${name}: ${over.join(" | ")}`);
      await page.screenshot({ path: join(SHOTS, `${name}.png`) });
      n++;
      process.stdout.write(".");
    }
  }
}

await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 5000))]);
server.closeAllConnections();
server.close();
console.log(`\n${n} screenshots in designs/qa/kebesaran/`);
if (problems.length) console.log(`Problems:\n- ${problems.join("\n- ")}`);
if (errors.length) console.log(`Page errors:\n- ${[...new Set(errors)].join("\n- ")}`);
process.exit(errors.length || problems.length ? 1 : 0);
