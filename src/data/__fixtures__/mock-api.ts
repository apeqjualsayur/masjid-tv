// Test helpers: a fake waktusolat.app + static host built from the real bundled data.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { MonthStore } from "../cache";
import type { FetchLike, MonthData, YearFile } from "../types";

export const YEAR_2026: YearFile = JSON.parse(
  readFileSync(join(process.cwd(), "public", "data", "SGR01-2026.json"), "utf8"),
);

/** Turn MonthData back into the raw API shape (epoch seconds, API field names). */
export function toApiResponse(m: MonthData) {
  return {
    zone: m.zone,
    year: m.year,
    month: "X",
    month_number: m.month,
    last_updated: null,
    prayers: m.days.map((d, i) => ({
      day: i + 1,
      hijri: d.hijri,
      imsak: d.times.imsak / 1000,
      fajr: d.times.subuh / 1000,
      syuruk: d.times.syuruk / 1000,
      dhuha: d.times.syuruk / 1000 + 1500,
      dhuhr: d.times.zohor / 1000,
      asr: d.times.asar / 1000,
      maghrib: d.times.maghrib / 1000,
      isha: d.times.isyak / 1000,
    })),
  };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export interface MockNet {
  fetch: FetchLike;
  calls: string[];
  online: boolean;
  /** How far the server clock is ahead of the device clock, ms. */
  serverAheadMs: number;
  /** Serve public/data/SGR01-2026.json at /data/. */
  bundled: boolean;
}

export function mockNet(opts: Partial<Omit<MockNet, "fetch" | "calls">> = {}): MockNet {
  const net: MockNet = {
    calls: [],
    online: opts.online ?? true,
    serverAheadMs: opts.serverAheadMs ?? 0,
    bundled: opts.bundled ?? true,
    fetch: async (url: string) => {
      net.calls.push(url);
      if (url.startsWith("/data/")) {
        return net.bundled && url === "/data/SGR01-2026.json" ? json(YEAR_2026) : new Response("Not found", { status: 404 });
      }
      if (!net.online) throw new TypeError("Failed to fetch");
      const u = new URL(url);
      if (u.pathname === "/chrono") return json({ unix: Math.floor((Date.now() + net.serverAheadMs) / 1000) });
      const m = /^\/v2\/solat\/(\w+)$/.exec(u.pathname);
      const year = Number(u.searchParams.get("year"));
      const month = Number(u.searchParams.get("month"));
      const data = m && m[1] === "SGR01" && year === 2026 ? YEAR_2026.months.find((x) => x.month === month) : undefined;
      return data ? json(toApiResponse(data)) : json({ message: "No data found" }, 404);
    },
  };
  return net;
}

export function memoryStore(): MonthStore & { map: Map<string, unknown> } {
  const map = new Map<string, unknown>();
  return {
    map,
    get: async (k) => structuredClone(map.get(k)),
    put: async (k, v) => void map.set(k, structuredClone(v)),
    delete: async (k) => void map.delete(k),
  };
}

export function memoryStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
}
