import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

// The whole Supabase module is replaced by spies: any use in demo mode would show up as a call.
vi.mock("@/lib/supabase", () => ({
  supabaseConfigured: vi.fn(() => true),
  getSupabase: vi.fn(() => {
    throw new Error("Supabase used in demo mode");
  }),
  getTvSupabase: vi.fn(() => {
    throw new Error("Supabase used in demo mode");
  }),
}));

import * as supabase from "@/lib/supabase";
import { parseUrlOverrides } from "./config";
import { DEMO_URL, loadDemo, tvMode } from "./demo";

const demoJson = readFileSync(join(process.cwd(), "public", "config", "demo.json"), "utf8");
const fetchDemo = vi.fn(async (url: string) => {
  if (url !== DEMO_URL) throw new Error(`unexpected fetch ${url}`);
  return new Response(demoJson, { status: 200, headers: { "content-type": "application/json" } });
});

afterEach(() => vi.clearAllMocks());

describe("live demo (/tv?demo=1)", () => {
  it("demo wins over pairing and local mode, even with Supabase configured", () => {
    expect(tvMode("?demo=1", true)).toBe("demo");
    expect(tvMode("?demo=1&local=1", true)).toBe("demo");
    expect(tvMode("", true)).toBe("paired");
    expect(tvMode("?local=1", true)).toBe("local");
  });

  it("boots from demo.json only and never calls Supabase", async () => {
    tvMode("?demo=1", supabase.supabaseConfigured());
    const src = await loadDemo(fetchDemo as unknown as typeof fetch);
    expect(fetchDemo).toHaveBeenCalledTimes(1);
    expect(fetchDemo).toHaveBeenCalledWith(DEMO_URL, expect.anything());
    expect(supabase.getSupabase).not.toHaveBeenCalled();
    expect(supabase.getTvSupabase).not.toHaveBeenCalled();
    expect(src.demo).toBe(true);
    expect(src.warnings).toEqual([]);
  });

  it("demo content: masjid, zone, theme, layout, default iqamah and the 4 slides", async () => {
    const { config, slides } = await loadDemo(fetchDemo as unknown as typeof fetch);
    expect(config.masjid.fullName).toBe("Masjid Demo Masjid View");
    expect([config.zone, config.theme, config.layout]).toEqual(["WLY01", "tenang", "bottom"]);
    expect(config.iqamahMin).toEqual({ subuh: 10, zohor: 10, asar: 10, maghrib: 7, isyak: 10 });
    const kinds = slides.map((s) => (s.payload.kind === "template" ? s.payload.template : `poster:${s.payload.imageUrl}`));
    expect(kinds).toEqual(["kuliah", "infaq", "imam_bilal", "poster:/config/demo-poster.png"]);
    const infaq = slides[1].payload;
    expect(infaq.kind === "template" && infaq.fields).toMatchObject({ target: 50000, collected: 32400 });
  });

  it("theme / layout / sim / speed work on top of the demo without ?debug=1", () => {
    const { overrides, warnings } = parseUrlOverrides("?demo=1&theme=alam&layout=full&sim=2026-10-22T13:20&speed=60", "masjidview.my");
    expect(warnings).toEqual([]);
    expect(overrides).toMatchObject({ theme: "alam", layout: "full", speed: 60, debug: false });
    expect(overrides.simStartMs).toBeTypeOf("number");
    // without demo=1 the live site still ignores them
    expect(parseUrlOverrides("?theme=alam", "masjidview.my").overrides.theme).toBeUndefined();
  });

  it("the demo module does not import the Supabase client", () => {
    const code = readFileSync(join(process.cwd(), "src", "app", "(ms)", "tv", "demo.ts"), "utf8");
    expect(code).not.toMatch(/@\/lib\/supabase|pairing\//);
  });
});