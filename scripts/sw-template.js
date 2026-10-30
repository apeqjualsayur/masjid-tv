/* Masjid TV service worker (hand-written, no library).
 * scripts/build-sw.ts copies this to out/sw.js after `next build`, filling in VERSION and PRECACHE
 * (every file of the static export: app shell, hashed JS/CSS, self-hosted fonts, config, bundled
 * prayer data). Strategies:
 *   pages ............ network-first (3 s), fall back to the cached /tv/ shell
 *   /_next/static .... cache-first (hashed, immutable)
 *   /data/*.json ..... cache-first (bundled per build)
 *   /config/*.json ... network-first, so AJK edits show up; cached copy when offline
 *   posters/images ... cache-first, stored in the runtime cache on first view
 *   bundle media ..... (Supabase public bucket 'media': logo + posters) cache-first in its own cache,
 *                      fetched in CORS mode (no opaque responses filling the quota); the app sends
 *                      {type:"media-sync", urls} after each bundle: unreferenced files are deleted,
 *                      missing ones downloaded, so the TV has every poster before going offline
 *   prayer API ....... network-first, fall back to the last cached response, marked x-sw-cache: hit
 *                      so the app knows it is offline (never reported as a fresh sync)
 *   /chrono .......... network only, never cached: a stale time would set a wrong clock offset
 */
/* eslint-disable */
const VERSION = "__VERSION__";
const PRECACHE = __PRECACHE__;

const SHELL = "masjid-tv-shell-" + VERSION;
const RUNTIME = "masjid-tv-runtime"; // posters + API responses, kept across versions
const RUNTIME_MAX = 80;
const MEDIA = "masjid-view-media"; // only what the current bundle references (pruned by media-sync)
const MEDIA_PATH = "/storage/v1/object/public/media/";
const API_HOST = "api.waktusolat.app";

function classify(url, request) {
  if (request.method !== "GET") return "passthrough";
  const u = new URL(url);
  if (u.pathname.startsWith(MEDIA_PATH)) return "media";
  if (u.hostname === API_HOST) return u.pathname === "/chrono" ? "passthrough" : "network-first";
  const isImage = request.destination === "image" || /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(u.pathname);
  if (u.origin !== self.location.origin) return isImage ? "cache-first" : "passthrough";
  if (request.mode === "navigate") return "page";
  if (u.pathname === "/version.json") return "passthrough"; // always the live version, never cached
  if (u.pathname.startsWith("/_next/static/")) return "cache-first";
  if (u.pathname.startsWith("/data/")) return "cache-first";
  if (u.pathname.startsWith("/config/") && u.pathname.endsWith(".json")) return "network-first";
  if (isImage) return "cache-first";
  return "network-first";
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

async function trim(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - RUNTIME_MAX; i++) await cache.delete(keys[i]);
}

async function store(request, response) {
  if (!response || !(response.ok || response.type === "opaque")) return;
  const cache = await caches.open(RUNTIME);
  await cache.put(request, response);
  await trim(cache);
}

async function cacheFirst(request) {
  const hit = await caches.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  await store(request, res.clone());
  return res;
}

async function networkFirst(request, timeoutMs) {
  try {
    const res = await withTimeout(fetch(request), timeoutMs);
    if (res.ok) await store(request, res.clone());
    return res;
  } catch (e) {
    // Newest copy first: the runtime cache holds what was last fetched; the shell has the build-time copy.
    const runtime = await caches.open(RUNTIME);
    const hit = (await runtime.match(request, { ignoreVary: true })) || (await caches.match(request, { ignoreVary: true }));
    if (hit) {
      const headers = new Headers(hit.headers);
      headers.set("x-sw-cache", "hit");
      return new Response(hit.body, { status: hit.status, statusText: hit.statusText, headers });
    }
    return new Response(JSON.stringify({ offline: true }), { status: 504, headers: { "content-type": "application/json" } });
  }
}

function corsGet(url) {
  return fetch(new Request(url, { mode: "cors", credentials: "omit" }));
}

async function mediaFirst(request) {
  const cache = await caches.open(MEDIA);
  const hit = await cache.match(request.url);
  if (hit) return hit;
  try {
    const res = await corsGet(request.url);
    if (res.ok) await cache.put(request.url, res.clone());
    return res;
  } catch (e) {
    return fetch(request);
  }
}

/** Keep exactly the media the bundle references: delete the rest, download what is missing. */
async function mediaSync(urls) {
  const keep = new Set(urls);
  const cache = await caches.open(MEDIA);
  for (const req of await cache.keys()) if (!keep.has(req.url)) await cache.delete(req);
  for (const url of keep) {
    if (await cache.match(url)) continue;
    try {
      const res = await corsGet(url);
      if (res.ok) await cache.put(url, res);
    } catch (e) {
      // offline: fetched on first view later
    }
  }
}

async function page(request) {
  try {
    return await withTimeout(fetch(request), 3000);
  } catch (e) {
    return (
      (await caches.match(request, { ignoreSearch: true })) ||
      (await caches.match("/tv/")) ||
      new Response("Offline", { status: 503 })
    );
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("masjid-tv-shell-") && k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "version") event.source && event.source.postMessage({ type: "version", version: VERSION });
  if (event.data && event.data.type === "media-sync" && Array.isArray(event.data.urls)) {
    const urls = event.data.urls.filter((u) => typeof u === "string" && new URL(u).pathname.startsWith(MEDIA_PATH));
    const done = mediaSync(urls);
    if (event.waitUntil) event.waitUntil(done);
  }
});

self.addEventListener("fetch", (event) => {
  const kind = classify(event.request.url, event.request);
  if (kind === "passthrough") return;
  if (kind === "page") return event.respondWith(page(event.request));
  if (kind === "cache-first") return event.respondWith(cacheFirst(event.request));
  if (kind === "media") return event.respondWith(mediaFirst(event.request));
  event.respondWith(networkFirst(event.request, 5000));
});