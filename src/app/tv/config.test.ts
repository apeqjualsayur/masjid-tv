import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { localToEpoch } from "@/core";
import { DEFAULT_SCREEN_CONFIG, isLocalMode, parseScreenConfig, parseUrlOverrides } from "./config";
import { loadScreenConfig } from "./config-loader";

const shipped = JSON.parse(readFileSync(join(process.cwd(), "public", "config", "screen.json"), "utf8"));

describe("parseScreenConfig", () => {
  it("the shipped screen.json parses cleanly and equals the defaults", () => {
    expect(parseScreenConfig(shipped)).toEqual({ config: DEFAULT_SCREEN_CONFIG, warnings: [] });
  });

  it("bad fields fall back individually, with warnings", () => {
    const { config, warnings } = parseScreenConfig({
      ...shipped,
      theme: "pink",
      zone: "sgr03",
      iqamahMin: { ...shipped.iqamahMin, maghrib: -1, isyak: 15 },
      clock24h: "yes",
    });
    expect(config.theme).toBe("alam");
    expect(config.zone).toBe("SGR03");
    expect(config.iqamahMin).toMatchObject({ maghrib: 7, isyak: 15 });
    expect(config.clock24h).toBe(false);
    expect(warnings).toHaveLength(3);
  });

  it("garbage gives defaults and an unknown zone is flagged", () => {
    expect(parseScreenConfig("nope").config).toEqual(DEFAULT_SCREEN_CONFIG);
    expect(parseScreenConfig({ zone: "ABC99" }).warnings).toContain("zone ABC99 is not in the JAKIM zone list");
  });
});

describe("parseUrlOverrides (PRD section 10)", () => {
  const all = "?sim=2026-10-17T13:04:30&speed=10&theme=serambi&layout=side&mode=iqamah&day=fri&slide=kuliah";

  it("honoured with debug=1", () => {
    const { overrides, warnings } = parseUrlOverrides(`${all}&debug=1`, "masjid.example");
    expect(warnings).toEqual([]);
    expect(overrides).toEqual({
      debug: true,
      debugState: false,
      debugAllowed: true,
      simStartMs: localToEpoch(2026, 10, 17, 13, 4, 30),
      speed: 10,
      theme: "serambi",
      layout: "side",
      mode: "iqamah",
      forceFriday: true,
      slide: "kuliah",
    });
  });

  it("honoured on localhost without debug=1", () => {
    expect(parseUrlOverrides(all, "localhost").overrides).toMatchObject({ debug: false, debugAllowed: true, theme: "serambi" });
    expect(parseUrlOverrides(all, "127.0.0.1").overrides.debugAllowed).toBe(true);
  });

  it("ignored on a real host without debug=1", () => {
    const { overrides, warnings } = parseUrlOverrides(all, "masjid.example");
    expect(overrides).toEqual({ debug: false, debugState: false, debugAllowed: false, forceFriday: false });
    expect(warnings).toEqual(["ignored theme, layout, mode, sim, speed, day, slide (add ?debug=1)"]);
  });

  it("lite is always honoured, both ways", () => {
    expect(parseUrlOverrides("?lite=1", "masjid.example").overrides.lite).toBe(true);
    expect(parseUrlOverrides("?lite=0", "masjid.example").overrides.lite).toBe(false);
    expect(parseUrlOverrides("", "masjid.example").overrides.lite).toBeUndefined();
  });

  it("invalid values are reported, not applied", () => {
    const { overrides, warnings } = parseUrlOverrides("?debug=1&sim=yesterday&speed=-2&theme=x&mode=dance&day=mon", "h");
    expect(overrides).toEqual({ debug: true, debugState: false, debugAllowed: true, forceFriday: false });
    expect(warnings).toHaveLength(5);
  });
});

describe("loadScreenConfig", () => {
  const storage = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
  };
  const ok = async () => new Response(JSON.stringify({ ...shipped, theme: "tenang" }));
  const down = async (): Promise<Response> => {
    throw new TypeError("Failed to fetch");
  };

  it("network, then the saved copy when offline, then defaults", async () => {
    const st = storage();
    expect(await loadScreenConfig(ok, st)).toMatchObject({ source: "network", config: { theme: "tenang" } });
    expect(await loadScreenConfig(down, st)).toMatchObject({ source: "saved", config: { theme: "tenang" } });
    expect(await loadScreenConfig(down, storage())).toMatchObject({ source: "default", config: DEFAULT_SCREEN_CONFIG });
  });
});
describe("isLocalMode (Phase 2 pairing vs Phase 1 local display)", () => {
  it("local with ?local=1 or without Supabase settings; otherwise pairing", () => {
    expect(isLocalMode("?local=1", true)).toBe(true);
    expect(isLocalMode("?debug=state&local=1", true)).toBe(true);
    expect(isLocalMode("", false)).toBe(true);
    expect(isLocalMode("", true)).toBe(false);
    expect(isLocalMode("?theme=alam", true)).toBe(false);
    expect(isLocalMode("?local=0", true)).toBe(false);
  });
});
