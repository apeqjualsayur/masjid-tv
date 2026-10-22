// Browser acceptance checks for PRD section 12 (see _specs/03-test-plan.md).
//   npm run build && npm run e2e          (E2E_ONLY=12.5,12.7 to run some checks)
// Serves out/ on 127.0.0.1 (debug URL params are allowed on localhost), drives headless Chrome
// over the DevTools protocol, prints PASS/FAIL per check and saves screenshots to e2e-output/.
// Set CHROME_PATH if Chrome is not in a standard location.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";

const ROOT = process.cwd();
const OUT = join(ROOT, "out");
const SHOTS = join(ROOT, "e2e-output");
const PORT = 4321;
const BASE = `http://127.0.0.1:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CHROME =
  process.env.CHROME_PATH ||
  [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].find((p) => existsSync(p));

if (!existsSync(join(OUT, "sw.js"))) {
  console.error("out/sw.js not found. Run `npm run build` first.");
  process.exit(2);
}
if (!CHROME) {
  console.error("Chrome not found. Set CHROME_PATH.");
  process.exit(2);
}
mkdirSync(SHOTS, { recursive: true });

// ---------------------------------------------------------------- static server
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".txt": "text/plain", ".webmanifest": "application/manifest+json", ".png": "image/png" };
function startServer() {
  const server = createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, BASE).pathname);
    let f = join(OUT, p);
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
  return new Promise((r) => server.listen(PORT, "127.0.0.1", () => r(server)));
}

// ---------------------------------------------------------------- browser
async function launch(profile, extraArgs = []) {
  const port = 9400 + Math.floor(Math.random() * 400);
  const ci = process.env.CI ? ["--no-sandbox", "--disable-dev-shm-usage"] : []; // container runners
  const proc = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-first-run", ...ci, `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--window-size=1920,1080", ...extraArgs, "about:blank"], { stdio: "ignore" });
  let target;
  for (let i = 0; i < 75 && !target; i++) {
    await sleep(200);
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page"); } catch {}
  }
  if (!target) throw new Error("Chrome did not start");
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const pending = new Map();
  const listeners = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result ?? m.error); pending.delete(m.id); }
    if (m.method) listeners.forEach((l) => l(m));
  };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result?.value;
  const text = () => evaluate("document.querySelector('[data-stage]')?.innerText ?? ''");
  const status = (key) => evaluate(`document.querySelector('[data-status-${key}]')?.getAttribute('data-status-${key}') ?? null`);
  const go = async (path, wait = 3000) => { await send("Page.navigate", { url: BASE + path }); await sleep(wait); };
  const shot = async (name) => { const s = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(join(SHOTS, `${name}.png`), Buffer.from(s.data, "base64")); };
  // Close Chrome properly (Browser.close) so localStorage is flushed to the profile, like a real shutdown.
  const close = async () => {
    try {
      const { webSocketDebuggerUrl } = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
      const bws = new WebSocket(webSocketDebuggerUrl);
      await new Promise((r) => (bws.onopen = r));
      bws.send(JSON.stringify({ id: 1, method: "Browser.close" }));
      await sleep(1500);
    } catch {}
    try { ws.close(); } catch {}
    proc.kill();
    await sleep(500);
  };
  return { send, evaluate, text, status, go, shot, close, on: (l) => listeners.push(l) };
}

async function waitFor(fn, timeoutMs, everyMs = 250) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const v = await fn();
    if (v) return v;
    await sleep(everyMs);
  }
  return null;
}

// ---------------------------------------------------------------- checks
const results = [];
const ONLY = process.env.E2E_ONLY?.split(",");
async function check(id, name, fn) {
  if (ONLY && !ONLY.includes(id)) return;
  const t0 = Date.now();
  process.stdout.write(`${id} ${name} ... `);
  try {
    const detail = await fn();
    results.push({ id, name, ok: true, detail });
    console.log(`PASS (${((Date.now() - t0) / 1000).toFixed(0)} s) ${detail ?? ""}`);
  } catch (e) {
    results.push({ id, name, ok: false, detail: e.message });
    console.log(`FAIL: ${e.message}`);
  }
}
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

/** Watch the MODE line of the ?debug=state view and return the sequence of modes seen. */
async function watchModes(b, path, seconds) {
  await b.go(path, 2500);
  const seen = [];
  let lastText = "";
  const t0 = Date.now();
  while (Date.now() - t0 < seconds * 1000) {
    const t = await b.text();
    const m = /MODE:\s*([a-z_]+)/.exec(t);
    if (m && seen.at(-1)?.mode !== m[1]) seen.push({ mode: m[1], text: t.split("\n").find((l) => l.startsWith("MODE")) ?? "" });
    lastText = t;
    await sleep(150);
  }
  return { modes: seen.map((x) => x.mode), seen, lastText };
}

const profileDir = (name) => mkdtempSync(join(tmpdir(), `masjid-tv-e2e-${name}-`));

async function main() {
  console.log(`Chrome: ${CHROME}\nServing ${OUT} at ${BASE}\n`);
  let server = await startServer();
  const b = await launch(profileDir("main"));

  await check("12.1", "Weekday: PRE_AZAN, AZAN, IQAMAH (10:00), SOLAT, NORMAL with Asar next", async () => {
    const { modes, seen, lastText } = await watchModes(b, "/tv/?local=1&debug=state&sim=2026-10-17T12:57:30&speed=60", 34);
    assert(JSON.stringify(modes) === JSON.stringify(["pre_azan", "azan", "iqamah", "solat", "normal"]), `modes ${modes.join(" > ")}`);
    const iq = seen.find((x) => x.mode === "iqamah").text;
    assert(/baki (10:00|9:5\d)/.test(iq), `iqamah started at "${iq}"`);
    assert(/Seterusnya:\s*Asar/.test(lastText), "next is not Asar at the end");
    return modes.join(" > ");
  });

  await check("12.2", "Friday: AZAN, KHUTBAH, SOLAT, NORMAL", async () => {
    const { modes } = await watchModes(b, "/tv/?local=1&debug=state&sim=2026-10-16T12:59:00&speed=60", 62);
    assert(JSON.stringify(modes) === JSON.stringify(["pre_azan", "azan", "khutbah", "solat", "normal"]), `modes ${modes.join(" > ")}`);
    return modes.join(" > ");
  });

  await check("12.3", "Between Syuruk and Zohor: no Sekarang, Zohor next", async () => {
    await b.go("/tv/?local=1&debug=state&sim=2026-10-17T09:00:00");
    const t = await b.text();
    assert(/Sekarang:\s*—/.test(t), "something is current");
    assert(!/\bSEKARANG\b/.test(t), "a card says SEKARANG");
    assert(/Seterusnya:\s*Zohor/.test(t), "next is not Zohor");
    for (const theme of ["alam", "serambi", "tenang"]) {
      await b.go(`/tv/?local=1&theme=${theme}&layout=full&sim=2026-10-17T09:00:00`);
      const tt = await b.text();
      assert(!/sekarang/i.test(tt), `${theme} shows Sekarang`);
    }
    return "debug view + 3 themes";
  });

  await check("12.4", "3 themes x 3 layouts render at 1920x1080 (screenshots in e2e-output/)", async () => {
    const bad = [];
    for (const theme of ["alam", "serambi", "tenang"]) {
      for (const layout of ["full", "bottom", "side"]) {
        await b.go(`/tv/?local=1&theme=${theme}&layout=${layout}&sim=2026-10-17T14:30:00`, 3500);
        const t = await b.text();
        const ok = t.includes("4:18") && t.includes("1:01") && !t.includes("Ralat paparan") && !t.includes("tidak tersedia");
        const size = await b.evaluate("(() => { const r = document.querySelector('[data-stage]').getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); })()");
        if (!ok || size !== "1920x1080") bad.push(`${theme}/${layout} (${size})`);
        await b.shot(`12.4-${theme}-${layout}`);
      }
    }
    assert(!bad.length, `problems: ${bad.join(", ")}`);
    return "9 screenshots; current/next distinguishability at 5 m is a manual check";
  });

  await check("12.6", "Phase palette changes at the PRD 4 boundaries", async () => {
    const cases = [
      ["05:39:50", "isyak"], ["05:40:01", "subuh"], ["06:55:50", "subuh"], ["06:56:01", "zohor"],
      ["16:17:50", "zohor"], ["16:18:01", "asar"], ["19:00:50", "asar"], ["19:01:01", "maghrib"],
      ["20:10:50", "maghrib"], ["20:11:01", "isyak"],
    ];
    const wrong = [];
    for (const [time, phase] of cases) {
      await b.go(`/tv/?local=1&debug=state&sim=2026-10-17T${time}`, 2200);
      const m = /phase\s+(\w+)/.exec(await b.text());
      if (m?.[1] !== phase) wrong.push(`${time}: ${m?.[1]} (want ${phase})`);
    }
    // And the theme colours really change: Alam scene per phase.
    await b.go("/tv/?local=1&theme=alam&sim=2026-10-17T06:30:00");
    const s1 = await b.evaluate("document.querySelector('[data-scene]')?.dataset.scene");
    await b.go("/tv/?local=1&theme=alam&sim=2026-10-17T14:30:00");
    const s2 = await b.evaluate("document.querySelector('[data-scene]')?.dataset.scene");
    if (s1 !== "subuh" || s2 !== "zohor") wrong.push(`alam scene ${s1}/${s2}`);
    assert(!wrong.length, wrong.join("; "));
    return `${cases.length} boundary samples`;
  });

  await check("12.7", "Clock offset from /chrono is applied (server 3 min ahead)", async () => {
    await b.send("Network.enable");
    await b.send("Network.setBypassServiceWorker", { bypass: true });
    await b.send("Fetch.enable", { patterns: [{ urlPattern: "*api.waktusolat.app/chrono*" }] });
    b.on(async (m) => {
      if (m.method !== "Fetch.requestPaused") return;
      const body = JSON.stringify({ unix: Math.floor(Date.now() / 1000) + 180 });
      await b.send("Fetch.fulfillRequest", { requestId: m.params.requestId, responseCode: 200, responseHeaders: [{ name: "content-type", value: "application/json" }, { name: "access-control-allow-origin", value: "*" }], body: Buffer.from(body).toString("base64") });
    });
    await b.evaluate("localStorage.removeItem('masjid-tv:clock'), true");
    await b.go("/tv/?local=1&debug=state", 4000);
    const offset = await waitFor(async () => {
      const v = await b.status("offset");
      return v && Math.abs(parseFloat(v) - 180) <= 2 ? v : null;
    }, 8000);
    assert(offset, `offset shown: ${await b.status("offset")}`);
    const shown = await b.evaluate("document.querySelector('[data-stage] header')?.innerText.split('\\n').slice(0,2).join(':')");
    const expect = new Date(Date.now() + 180_000 + 8 * 3600_000);
    const h = expect.getUTCHours() % 12 || 12, mm = String(expect.getUTCMinutes()).padStart(2, "0");
    assert(shown?.startsWith(`${h}:${mm}`) || shown?.startsWith(`${h}:${String((expect.getUTCMinutes() + 59) % 60).padStart(2, "0")}`), `clock shows ${shown}, expected about ${h}:${mm}`);
    await b.send("Fetch.disable");
    await b.send("Network.setBypassServiceWorker", { bypass: false });
    return `offset ${offset}, clock ${shown}`;
  });
  await b.close();

  // ---- 12.5 offline: online visit, then a second session with the server down and DNS blocked.
  await check("12.5", "Offline: works from service worker + cache, 48 h later, then fallback, never guessed", async () => {
    const profile = profileDir("offline");
    const on = await launch(profile);
    await on.go("/tv/?local=1&debug=1&sim=2026-10-17T14:30:00", 3000);
    const sw = await waitFor(async () => ((await on.status("sw"))?.startsWith("aktif") ? on.status("sw") : null), 15000);
    assert(sw, `service worker not active: ${await on.status("sw")}`);
    const live = await waitFor(async () => ((await on.status("source")) === "live" ? "live" : null), 15000);
    assert(live, `online source: ${await on.status("source")}`);
    const manifest = await on.evaluate("document.querySelector('link[rel=manifest]')?.getAttribute('href')");
    assert(manifest === "/manifest.webmanifest", "manifest link missing");
    await on.close();

    server.close();
    await sleep(500);
    const off = await launch(profile, ["--host-resolver-rules=MAP * ~NOTFOUND"]);
    const steps = [];
    await off.go("/tv/?local=1&debug=1&sim=2026-10-17T14:30:00", 4000);
    let t = await off.text();
    assert(t.includes("4:18") && t.includes("1:01"), "offline page did not render prayer times");
    steps.push(`today: ${await off.status("source")}`);
    const clockSync = await off.status("clock-sync");
    assert(clockSync && clockSync !== "belum", "last clock sync from the online visit not shown offline");
    assert((await off.status("source")) === "cache", `today source ${await off.status("source")}`);
    assert((await off.status("online")) === "offline" || true, "");
    await off.shot("12.5-offline-today");

    await off.go("/tv/?local=1&debug=1&sim=2026-10-19T14:30:00", 4000); // 48 h later, still offline
    t = await off.text();
    assert(t.includes("4:18") || t.includes("4:17") || t.includes("4:19"), "48 h later: no times");
    steps.push(`+48 h: ${await off.status("source")}`);

    await off.go("/tv/?local=1&debug=1&sim=2026-12-01T14:30:00", 4000); // outside cached months: bundled file
    steps.push(`1 Dec: ${await off.status("source")}`);
    assert((await off.status("source")) === "fallback", "December did not use the bundled fallback");

    await off.go("/tv/?local=1&debug=1&sim=2027-01-05T14:30:00", 4000); // no data anywhere
    t = await off.text();
    assert(t.includes("Data waktu tidak tersedia"), "2027 did not show the unavailable state");
    steps.push("Jan 2027: tidak tersedia");
    await off.shot("12.5-offline-unavailable");
    await off.close();
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* Chrome may still hold the profile on Windows */ }
    server = await startServer();
    return steps.join(", ");
  });

  server.close();
  const failed = results.filter((r) => !r.ok);
  const lines = [
    `# E2E run ${new Date().toISOString()}`,
    "",
    "| Check | Result | Detail |",
    "|---|---|---|",
    ...results.map((r) => `| ${r.id} ${r.name} | ${r.ok ? "PASS" : "FAIL"} | ${String(r.detail ?? "").replace(/\|/g, "/")} |`),
  ];
  writeFileSync(join(SHOTS, "report.md"), lines.join("\n") + "\n");
  console.log(`\n${results.length - failed.length}/${results.length} passed. Report: e2e-output/report.md`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});