// Screenshots of the Jadual Imam & Bilal slide (PRD enhancements §6.4) for visual QA.
//   npm run build && npm run qa:petugas
// Serves out/ on 127.0.0.1 and drives the installed Chrome (playwright-core, no `playwright install`).
// Local mode uses SAMPLE_ROSTER (src/templates/samples.ts): Rabu and Ahad have the long names, Khamis and
// Jumaat a per-waktu exception. Writes 1920×1080 PNGs to designs/qa/petugas/ (git-ignored): 7 themes ×
// 3 areas × (minggu, hari_ini on a Monday, hari_ini on a Friday, long names), and fails when the slide
// overflows its area or a name is cut below 18 px. Names that still end in "…" at 18 px are listed.
// The sim dates must have bundled prayer data (public/data/).
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { chromium } from "playwright-core";

const ROOT = process.cwd();
const OUT = join(ROOT, "out");
const SHOTS = join(ROOT, "designs", "qa", "petugas");
const PORT = 4325;
const BASE = `http://127.0.0.1:${PORT}`;
const THEMES = ["tenang", "serambi", "alam", "falak", "garis", "kerawang", "seterusnya"];
const LAYOUTS = ["bottom", "side", "poster"];

/** Malaysia today's date key, and the next given weekday (1 = Isnin … 7 = Ahad) from it, at hh:mm. */
const todayMy = new Date(Date.now() + 8 * 3600_000);
const nextDay = (iso, hhmm) => {
  const dow = ((todayMy.getUTCDay() + 6) % 7) + 1;
  const n = ((iso - dow + 7) % 7) || 7;
  return new Date(todayMy.getTime() + n * 86_400_000).toISOString().slice(0, 10) + "T" + hhmm;
};
const STATES = {
  minggu: { view: "minggu", sim: todayMy.toISOString().slice(0, 10) + "T10:00" },
  "hari-ini": { view: "hari_ini", sim: nextDay(1, "10:00") },
  "hari-ini-jumaat": { view: "hari_ini", sim: nextDay(5, "10:00") },
  "nama-panjang": { view: "hari_ini", sim: nextDay(3, "10:00") },
  "nama-panjang-minggu": { view: "minggu", sim: nextDay(3, "10:00") },
};
let view = "minggu";

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
await page.route("**/config/sample-slides.json", (r) =>
  r.fulfill({ contentType: "application/json", body: JSON.stringify([{ id: "jp", type: "template", template_key: "jadual_petugas", status: "active", fields: { view } }]) }),
);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

const problems = [];
const ellipsis = [];
let n = 0;
for (const theme of THEMES) {
  for (const layout of LAYOUTS) {
    for (const [state, { view: v, sim }] of Object.entries(STATES)) {
      view = v;
      const name = `${theme}-${layout}-${state}`;
      await page.goto(`${BASE}/tv/?local=1&theme=${theme}&layout=${layout}&sim=${sim}`);
      try {
        await page.waitForSelector("[data-roster]", { timeout: 15_000 });
      } catch {
        problems.push(`${name}: the slide did not show (sim ${sim})`);
        continue;
      }
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(900);
      const over = await page.evaluate(() => {
        const area = document.querySelector("[data-poster-area]").getBoundingClientRect();
        const out = [];
        for (const el of document.querySelectorAll("[data-roster] *")) {
          const b = el.getBoundingClientRect();
          if (b.width === 0 || b.height === 0) continue;
          if (b.bottom > area.bottom + 1 || b.right > area.right + 1 || b.left < area.left - 1 || b.top < area.top - 1) out.push((el.textContent || el.tagName).trim().slice(0, 40));
          if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== "visible") {
            const px = parseFloat(getComputedStyle(el).fontSize);
            if (el.hasAttribute("data-fit-text") && px <= 18) window.__ellipsis = [...(window.__ellipsis || []), el.textContent];
            else out.push(`clipped at ${px}px: ${(el.textContent || "").trim().slice(0, 40)}`);
          }
          if (el.hasAttribute("data-fit-text") && parseFloat(getComputedStyle(el).fontSize) < 18) out.push(`under 18px: ${el.textContent}`);
        }
        // A row too short for its content (e.g. the day + a wrapped "+ ikut waktu") spills into the next.
        for (const c of document.querySelectorAll('[data-roster] [role="cell"]')) {
          if (c.scrollHeight > c.clientHeight + 1) out.push(`row too short: ${c.textContent.trim().slice(0, 40)}`);
        }
        return [...new Set(out)].slice(0, 4);
      });
      if (over.length) problems.push(`${name}: ${over.join(" | ")}`);
      const cut = await page.evaluate(() => window.__ellipsis || []);
      if (cut.length) ellipsis.push(`${name}: ${[...new Set(cut)].join(" | ")}`);
      await page.screenshot({ path: join(SHOTS, `${name}.png`) });
      n++;
      process.stdout.write(".");
    }
  }
}

await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 5000))]);
server.closeAllConnections();
server.close();
console.log(`\n${n} screenshots in designs/qa/petugas/`);
if (ellipsis.length) console.log(`Ends in "…" at 18 px (allowed):\n- ${ellipsis.join("\n- ")}`);
if (problems.length) console.log(`Problems:\n- ${problems.join("\n- ")}`);
if (errors.length) console.log(`Page errors:\n- ${[...new Set(errors)].join("\n- ")}`);
process.exit(errors.length || problems.length ? 1 : 0);
