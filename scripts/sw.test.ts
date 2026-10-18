// Runs the real service worker template in a sandbox with a fake CacheStorage and a switchable network.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { beforeEach, describe, expect, it } from "vitest";

const ORIGIN = "https://tv.example";
const PRECACHE = ["/", "/tv/", "/_next/static/chunks/app.js", "/config/screen.json", "/data/SGR01-2026.json", "/config/poster-portrait.svg"];

type Handler = (e: unknown) => void;

class FakeCache {
  store = new Map<string, Response>();
  private key(req: Request | string, ignoreSearch = false) {
    const u = new URL(typeof req === "string" ? req : req.url, ORIGIN);
    if (ignoreSearch) u.search = "";
    return u.href;
  }
  async put(req: Request | string, res: Response) { this.store.set(this.key(req), res); }
  async match(req: Request | string, opts: { ignoreSearch?: boolean } = {}) {
    const hit = this.store.get(this.key(req, opts.ignoreSearch));
    return hit ? hit.clone() : undefined;
  }
  async keys() { return [...this.store.keys()].map((k) => new Request(k)); }
  async delete(req: Request | string) { return this.store.delete(this.key(req)); }
  async addAll(urls: string[]) { for (const u of urls) await this.put(u, await net(new Request(new URL(u, ORIGIN).href))); }
}

const cachesMap = new Map<string, FakeCache>();
const caches = {
  async open(name: string) { if (!cachesMap.has(name)) cachesMap.set(name, new FakeCache()); return cachesMap.get(name)!; },
  async match(req: Request | string, opts?: { ignoreSearch?: boolean }) {
    for (const c of cachesMap.values()) { const hit = await c.match(req, opts); if (hit) return hit; }
    return undefined;
  },
  async keys() { return [...cachesMap.keys()]; },
  async delete(name: string) { return cachesMap.delete(name); },
};

let online = true;
let serverValue = "v1";
const fetched: string[] = [];
async function net(req: Request): Promise<Response> {
  fetched.push(req.url);
  if (!online) throw new TypeError("Failed to fetch");
  return new Response(`${new URL(req.url).pathname} ${serverValue}`, { status: 200 });
}

function loadSw(version = "test1") {
  const handlers: Record<string, Handler> = {};
  const self = {
    location: { origin: ORIGIN },
    addEventListener: (t: string, h: Handler) => (handlers[t] = h),
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
  };
  const src = readFileSync(join(process.cwd(), "scripts", "sw-template.js"), "utf8")
    .replace('"__VERSION__"', JSON.stringify(version))
    .replace("__PRECACHE__", JSON.stringify(PRECACHE));
  const ctx = vm.createContext({ self, caches, fetch: net, Response, Request, Headers, URL, setTimeout, clearTimeout, Promise, JSON, console });
  vm.runInContext(src + "\n;globalThis.__classify = classify;", ctx);
  const classify = (ctx as unknown as { __classify: (u: string, r: object) => string }).__classify;
  const fire = async (type: string, extra: object = {}) => {
    let waited: Promise<unknown> | undefined;
    let responded: Promise<Response> | undefined;
    handlers[type]({ ...extra, waitUntil: (p: Promise<unknown>) => (waited = p), respondWith: (p: Promise<Response>) => (responded = p) });
    await waited;
    return responded ? await responded : undefined;
  };
  const get = (path: string, init: { mode?: string; destination?: string } = {}) => {
    const request = new Request(path.startsWith("http") ? path : ORIGIN + path);
    Object.defineProperty(request, "mode", { value: init.mode ?? "cors" });
    Object.defineProperty(request, "destination", { value: init.destination ?? "" });
    return fire("fetch", { request });
  };
  return { classify, fire, get };
}

beforeEach(() => {
  cachesMap.clear();
  online = true;
  serverValue = "v1";
  fetched.length = 0;
});

describe("routing", () => {
  it("picks the right strategy per request", () => {
    const { classify } = loadSw();
    const r = (mode = "cors", destination = "", method = "GET") => ({ mode, destination, method });
    expect(classify(`${ORIGIN}/tv/?debug=1`, r("navigate"))).toBe("page");
    expect(classify(`${ORIGIN}/_next/static/chunks/a.js`, r())).toBe("cache-first");
    expect(classify(`${ORIGIN}/data/SGR01-2026.json`, r())).toBe("cache-first");
    expect(classify(`${ORIGIN}/config/screen.json`, r())).toBe("network-first");
    expect(classify(`${ORIGIN}/config/poster-portrait.svg`, r("cors", "image"))).toBe("cache-first");
    expect(classify("https://cdn.example/poster.jpg", r("no-cors", "image"))).toBe("cache-first");
    expect(classify("https://api.waktusolat.app/v2/solat/SGR01?year=2026&month=10", r())).toBe("network-first");
    expect(classify("https://api.waktusolat.app/chrono", r())).toBe("passthrough"); // never cached
    expect(classify("https://other.example/x.js", r())).toBe("passthrough");
    expect(classify(`${ORIGIN}/config/screen.json`, r("cors", "", "POST"))).toBe("passthrough");
  });
});

describe("install / activate", () => {
  it("precaches the whole list into a versioned shell cache", async () => {
    const sw = loadSw("abc");
    await sw.fire("install");
    const shell = cachesMap.get("masjid-tv-shell-abc")!;
    expect(shell.store.size).toBe(PRECACHE.length);
  });

  it("activate removes old shell versions but keeps the runtime cache", async () => {
    (await caches.open("masjid-tv-shell-old")).put("/x", new Response("x"));
    (await caches.open("masjid-tv-runtime")).put("/poster.jpg", new Response("p"));
    const sw = loadSw("new");
    await sw.fire("install");
    await sw.fire("activate");
    expect([...cachesMap.keys()].sort()).toEqual(["masjid-tv-runtime", "masjid-tv-shell-new"]);
  });
});

describe("offline behaviour", () => {
  it("navigation falls back to the cached /tv/ shell, whatever the query string", async () => {
    const sw = loadSw();
    await sw.fire("install");
    online = false;
    const res = await sw.get("/tv/?debug=1&theme=alam", { mode: "navigate" });
    expect(await res!.text()).toBe("/tv/ v1");
  });

  it("app assets and bundled data come from the cache without the network", async () => {
    const sw = loadSw();
    await sw.fire("install");
    online = false;
    expect(await (await sw.get("/_next/static/chunks/app.js"))!.text()).toBe("/_next/static/chunks/app.js v1");
    expect(await (await sw.get("/data/SGR01-2026.json"))!.text()).toBe("/data/SGR01-2026.json v1");
  });

  it("config is network-first: fresh online, cached copy offline", async () => {
    const sw = loadSw();
    await sw.fire("install");
    serverValue = "v2";
    expect(await (await sw.get("/config/screen.json"))!.text()).toBe("/config/screen.json v2");
    online = false;
    expect(await (await sw.get("/config/screen.json"))!.text()).toBe("/config/screen.json v2");
  });

  it("prayer API: network-first; offline gives the last response marked x-sw-cache, 504 when never cached", async () => {
    const sw = loadSw();
    const api = "https://api.waktusolat.app/v2/solat/SGR01?year=2026&month=10";
    const fresh = await sw.get(api);
    expect(fresh!.status).toBe(200);
    expect(fresh!.headers.get("x-sw-cache")).toBeNull();
    online = false;
    const cached = await sw.get(api);
    expect(await cached!.text()).toBe("/v2/solat/SGR01 v1");
    expect(cached!.headers.get("x-sw-cache")).toBe("hit");
    const never = await sw.get("https://api.waktusolat.app/v2/solat/SGR01?year=2026&month=11");
    expect(never!.status).toBe(504);
  });

  it("/chrono is not handled by the worker at all (no stale clock)", async () => {
    const sw = loadSw();
    expect(await sw.get("https://api.waktusolat.app/chrono")).toBeUndefined();
  });

  it("posters are cache-first: fetched once, then served offline", async () => {
    const sw = loadSw();
    const poster = "https://cdn.example/uploads/kuliah.jpg";
    await sw.get(poster, { destination: "image" });
    await sw.get(poster, { destination: "image" });
    expect(fetched.filter((u) => u === poster)).toHaveLength(1);
    online = false;
    expect((await sw.get(poster, { destination: "image" }))!.status).toBe(200);
  });

  it("the runtime cache is capped", async () => {
    const sw = loadSw();
    for (let i = 0; i < 90; i++) await sw.get(`https://cdn.example/p${i}.jpg`, { destination: "image" });
    expect(cachesMap.get("masjid-tv-runtime")!.store.size).toBe(80);
  });
});