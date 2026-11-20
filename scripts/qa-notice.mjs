// Screenshots of activity notices and countdowns (PRD enhancements §3.4, §3.5, §4.2) for visual QA.
//   npm run build && npm run qa:notice
// Serves out/ on 127.0.0.1 and drives the installed Chrome through playwright-core (no `playwright
// install`). Each shot replaces sample-slides.json with one slide, so the real playlist + `live` path
// runs (not the ?slide= preview). Writes 1920×1080 PNGs to designs/qa/notice/ (git-ignored):
// 7 themes × 3 areas (bottom 12:5, side 5:4, poster 16:9) × 4 cases, plus Tenang at Isyak (dark stamp).
// Set CHROME_PATH if Chrome is not in a standard location.
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { chromium } from "playwright-core";

const ROOT = process.cwd();
const OUT = join(ROOT, "out");
const SHOTS = join(ROOT, "designs", "qa", "notice");
const PORT = 4323;
const BASE = `http://127.0.0.1:${PORT}`;
const THEMES = ["tenang", "serambi", "alam", "falak", "garis", "kerawang", "seterusnya"];
const LAYOUTS = ["bottom", "side", "poster"];
const SIM = "2026-10-17T10:00"; // a calm Saturday morning (normal mode, so the slide area shows)

const kuliah = {
  series: "Kuliah Dhuha", topic: "Adab Bertetangga Dalam Islam", speaker: "Ustaz Ahmad Zaki", venue: "Dewan Solat Utama",
  date: "Sabtu, 17 Oktober 2026", dateIso: "2026-10-17", time: "10:45 pagi",
};
const CASES = {
  "kuliah-tangguh": { template_key: "kuliah", fields: { ...kuliah, notice: { kind: "tangguh", newAt: "2026-10-24T10:45", reason: "Penceramah uzur" } } },
  "program-batal": {
    template_key: "program",
    fields: {
      title: "Hari Keluarga Kariah", description: "Sukaneka, jamuan dan cabutan bertuah untuk seisi keluarga.", date: "Ahad, 18 Oktober 2026", dateIso: "2026-10-18",
      time: "8:00 pagi", venue: "Padang Taman Contoh", organiser: "Biro Kebajikan", contact: "Ustaz Ali 012-345 6789",
      notice: { kind: "batal", reason: "Cuaca tidak mengizinkan" },
    },
  },
  penangguhan: {
    template_key: "penangguhan",
    fields: {
      title: "Kuliah Maghrib: Tafsir Surah Al-Kahfi", kind: "tangguh", date: "Selasa, 20 Oktober 2026", time: "Selepas Maghrib",
      newDate: "Selasa, 27 Oktober 2026", newDateIso: "2026-10-27", newTime: "Selepas Maghrib", person: "Ustaz Hafiz Rahman",
      reason: "Penceramah ada urusan keluarga", note: "Kami mohon maaf atas sebarang kesulitan.",
    },
  },
  "kuliah-countdown": { template_key: "kuliah", fields: kuliah }, // 45 min before 10:45 → "Bermula dalam 44:5x"
};

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

// Chromium args from the Windows teardown fix (sandboxed network service leaves undeletable profiles).
const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--enable-features=NetworkServiceInProcess,NetworkServiceInProcess2", "--disable-features=NetworkServiceSandbox"],
});
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, serviceWorkers: "block" });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

const problems = [];
async function shot(name, theme, layout, c, sim = SIM) {
  await page.unroute("**/config/sample-slides.json").catch(() => {});
  const slides = [{ id: name, type: "template", status: "active", ...c }];
  await page.route("**/config/sample-slides.json", (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify(slides) }));
  await page.goto(`${BASE}/tv/?local=1&theme=${theme}&layout=${layout}&sim=${sim}`);
  await page.waitForSelector("[data-poster-area]", { timeout: 15_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900); // cross-fade
  // Clipped text check: any element inside the slide whose content overflows its own box.
  const clipped = await page.evaluate(() => {
    const area = document.querySelector("[data-poster-area]");
    const r = area.getBoundingClientRect();
    const out = [];
    for (const el of area.querySelectorAll("[data-notice-stamp], [data-countdown]")) {
      const b = el.getBoundingClientRect();
      if (b.bottom > r.bottom + 1 || b.right > r.right + 1 || b.top < r.top - 1) out.push(el.getAttribute("data-notice-stamp") ? "stamp" : "countdown");
    }
    return out;
  });
  if (clipped.length) problems.push(`${name}: ${clipped.join(", ")} outside the slide area`);
  await page.screenshot({ path: join(SHOTS, `${name}.png`) });
  process.stdout.write(".");
}

let n = 0;
for (const theme of THEMES) {
  for (const layout of LAYOUTS) {
    for (const [key, c] of Object.entries(CASES)) {
      await shot(`${theme}-${layout}-${key}`, theme, layout, c);
      n++;
    }
  }
}
for (const layout of LAYOUTS) {
  await shot(`tenang-isyak-${layout}-kuliah-tangguh`, "tenang", layout, CASES["kuliah-tangguh"], "2026-10-17T21:30");
  n++;
}

await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 5000))]);
server.closeAllConnections();
server.close();
console.log(`\n${n} screenshots in designs/qa/notice/`);
if (problems.length) console.log(`Outside the slide area:\n- ${problems.join("\n- ")}`);
if (errors.length) console.log(`Page errors:\n- ${[...new Set(errors)].join("\n- ")}`);
process.exit(errors.length || problems.length ? 1 : 0);
