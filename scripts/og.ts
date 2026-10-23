// Social sharing image (PRD §8): renders an HTML template (lockup, H1, a TV frame on #F4F9F6) with
// Playwright to public/og.png, 1200×630.   npm run og
// Never downloads a browser (no `playwright install`): uses CHROME_PATH, a Chromium already in
// /opt/pw-browsers or the default Playwright folder, or the installed Google Chrome.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright-core";
import ms from "../src/landing/i18n/ms.json";

const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "public", "og.png");

function playwrightDirs(): string[] {
  const dirs = ["/opt/pw-browsers", process.env.PLAYWRIGHT_BROWSERS_PATH ?? ""];
  if (process.platform === "win32") dirs.push(join(process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local"), "ms-playwright"));
  else if (process.platform === "darwin") dirs.push(join(homedir(), "Library", "Caches", "ms-playwright"));
  else dirs.push(join(homedir(), ".cache", "ms-playwright"));
  return dirs.filter((d) => d && existsSync(d));
}

/** The browser to drive, or null. Order: CHROME_PATH, Playwright's Chromium, installed Chrome. */
export function findBrowser(): string | null {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const inside = ["chrome-win64/chrome.exe", "chrome-win/chrome.exe", "chrome-linux64/chrome", "chrome-linux/chrome", "chrome-mac-arm64/Chromium.app/Contents/MacOS/Chromium", "chrome-mac/Chromium.app/Contents/MacOS/Chromium"];
  for (const dir of playwrightDirs()) {
    const builds = readdirSync(dir).filter((n) => /^chromium-\d+$/.test(n)).sort().reverse();
    for (const b of builds) for (const rel of inside) if (existsSync(join(dir, b, rel))) return join(dir, b, rel);
  }
  const system = [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ];
  return system.find(existsSync) ?? null;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Prayer strip for the TV mockup (WLY01 on 22 Oct 2026), Zohor current, as on the hero. */
const TIMES: [string, string][] = [["Imsak", "5:39"], ["Subuh", "5:49"], ["Syuruk", "6:56"], ["Zohor", "1:01"], ["Asar", "4:18"], ["Maghrib", "7:00"], ["Isyak", "8:10"]];

function template(lockupSvg: string): string {
  const strip = TIMES.map(([n, t], i) => `<div class="w${i === 3 ? " cur" : ""}"><span>${n}</span><b>${t}</b></div>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=Manrope:wght@300;500;700;800&display=block" rel="stylesheet">
<style>
  html,body{margin:0}
  body{width:1200px;height:630px;overflow:hidden;background:#F4F9F6;font-family:Outfit,sans-serif;color:#10241B;position:relative}
  .glow{position:absolute;inset:0;background:radial-gradient(700px 420px at 78% 45%,#E7F4EB 0%,rgba(244,249,246,0) 70%)}
  .left{position:absolute;left:64px;top:58px;width:470px;display:flex;flex-direction:column;gap:26px}
  .lockup svg{height:44px;width:auto;display:block}
  .chip{align-self:flex-start;display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border-radius:999px;background:#fff;border:1px solid #E4EFE8;font-size:18px;font-weight:600;color:#2F7D4B}
  .chip i{width:9px;height:9px;border-radius:9px;background:#4FA36B}
  h1{margin:0;font-size:52px;line-height:1.08;font-weight:700;letter-spacing:-1.4px}
  .url{font-size:22px;font-weight:600;color:#2F7D4B}
  .tv{position:absolute;right:56px;top:96px;width:600px}
  .bezel{border-radius:14px;background:#121614;padding:10px;box-shadow:0 34px 60px rgba(16,36,27,.22)}
  .scr{aspect-ratio:16/9;border-radius:4px;overflow:hidden;background:#EAF3F8;color:#14303D;font-family:Manrope,sans-serif;display:flex;flex-direction:column;padding:16px 20px 12px;box-sizing:border-box;gap:10px}
  .top{display:flex;justify-content:space-between;font-size:11px;font-weight:700}.top span{color:#56707E;font-weight:500}
  .card{flex:1;border-radius:12px;background:#fff;padding:16px 22px;display:flex;flex-direction:column;justify-content:center;gap:4px}
  .card em{font-style:normal;font-size:10px;font-weight:800;letter-spacing:2px;color:#23709A}
  .card strong{font-size:26px;font-weight:800;letter-spacing:-.5px}
  .card small{font-size:12px;color:#56707E}
  .bar{display:flex;align-items:center;gap:12px}
  .clock{font-size:42px;font-weight:300;letter-spacing:-1px;line-height:1}
  .ws{flex:1;display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
  .w{display:flex;flex-direction:column;align-items:center;border-radius:8px;padding:5px 0;font-size:9px}
  .w b{font-size:15px;font-weight:700}
  .w.cur{background:#23709A;color:#fff}
  .stand{margin:0 auto;width:18%;height:22px;background:linear-gradient(180deg,#2A302D,#1A1E1C);clip-path:polygon(30% 0,70% 0,100% 100%,0 100%)}
  .foot{margin:0 auto;width:34%;height:6px;border-radius:3px;background:#1A1E1C}
</style></head><body>
<div class="glow"></div>
<div class="left">
  <div class="lockup">${lockupSvg}</div>
  <div class="chip"><i></i>${esc(ms.hero.chip)}</div>
  <h1>${esc(ms.hero.title)}</h1>
  <div class="url">masjidview.my</div>
</div>
<div class="tv"><div class="bezel"><div class="scr">
  <div class="top">Masjid Al-Hidayah<span>Khamis, 22 Oktober 2026</span></div>
  <div class="card"><em>KULIAH MAGHRIB</em><strong>Adab Menuntut Ilmu</strong><small>Selepas solat Maghrib · Dewan solat utama</small></div>
  <div class="bar"><div class="clock">1:20</div><div class="ws">${strip}</div></div>
</div></div><div class="stand"></div><div class="foot"></div></div>
</body></html>`;
}

async function main() {
  const exe = findBrowser();
  if (!exe) {
    console.error("No Chromium or Chrome found. Set CHROME_PATH (this script never runs `playwright install`).");
    process.exit(1);
  }
  const lockup = readFileSync(join(ROOT, "public", "brand", "mv-lockup.svg"), "utf8").replace(/<\?xml[^>]*>/, "");
  const browser = await chromium.launch({ executablePath: exe });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
    await page.setContent(template(lockup), { waitUntil: "load", timeout: 30_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: OUT, clip: { x: 0, y: 0, width: 1200, height: 630 } });
    console.log(`Wrote ${OUT} (1200×630) using ${exe}`);
  } finally {
    // browser.close() can hang on Windows after a screenshot; don't wait for it forever.
    await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 5000))]);
  }
}

if (require.main === module)
  main().then(
    () => process.exit(0),
    (e) => {
      console.error(e);
      process.exit(1);
    },
  );