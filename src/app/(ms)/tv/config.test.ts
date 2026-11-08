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

  it("invalid values are reported, not applied (an unknown theme falls back to tenang, PRD round 2 D7)", () => {
    const { overrides, warnings } = parseUrlOverrides("?debug=1&sim=yesterday&speed=-2&theme=x&mode=dance&day=mon", "h");
    expect(overrides).toEqual({ debug: true, debugState: false, debugAllowed: true, forceFriday: false, theme: "tenang" });
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

describe("Friday durations (PRD §9.4)", () => {
  it("an old screen.json without jumaatSolatMin / showFridayInfo gets the defaults, no warnings", () => {
    const { config, warnings } = parseScreenConfig({ durations: { preAzanMin: 5, azanMin: 3, solatMin: 12, khutbahMin: 40 } });
    expect(config.durations).toEqual({ preAzanMin: 5, azanMin: 3, solatMin: 12, khutbahMin: 40, jumaatSolatMin: 12, showFridayInfo: true });
    expect(warnings).toEqual([]);
  });
  it("custom and invalid values", () => {
    expect(parseScreenConfig({ durations: { jumaatSolatMin: 15, showFridayInfo: false } }).config.durations).toMatchObject({ jumaatSolatMin: 15, showFridayInfo: false });
    const bad = parseScreenConfig({ durations: { jumaatSolatMin: -1, showFridayInfo: "yes" } });
    expect(bad.config.durations).toMatchObject({ jumaatSolatMin: 12, showFridayInfo: true });
    expect(bad.warnings).toHaveLength(2);
  });
});

describe("sound (_specs/50-PRD-sound.md D8, local mode)", () => {
  const OFF = { enabled: false, volume: 70, azan: "chime", iqamah: "hayya" };

  it("the shipped screen.json has sound off; a screen.json without `sound` is off too, no warning", () => {
    expect(parseScreenConfig(shipped).config.sound).toEqual(OFF);
    const { sound: _omit, ...old } = shipped;
    expect(parseScreenConfig(old)).toMatchObject({ config: { sound: OFF }, warnings: [] });
  });

  it("valid sound is kept; bad fields fall back with one warning", () => {
    expect(parseScreenConfig({ ...shipped, sound: { enabled: true, volume: 40, azan: "beep", iqamah: "alarm" } })).toMatchObject({
      config: { sound: { enabled: true, volume: 40, azan: "beep", iqamah: "alarm" } },
      warnings: [],
    });
    const bad = parseScreenConfig({ ...shipped, sound: { enabled: true, volume: 400, azan: "gong" } });
    expect(bad.config.sound).toEqual({ ...OFF, enabled: true });
    expect(bad.warnings).toEqual(["sound invalid; using defaults for the bad fields"]);
    expect(parseScreenConfig({ ...shipped, sound: "on" }).config.sound).toEqual(OFF);
  });

  it("debug params: sound=1, soundAzan=, soundIqamah=, vol=, mute=1", () => {
    const { overrides, warnings } = parseUrlOverrides("?debug=1&sound=1&soundAzan=alarm&soundIqamah=off&vol=35", "masjidview.my");
    expect(overrides.sound).toEqual({ enabled: true, azan: "alarm", iqamah: "off", volume: 35 });
    expect(warnings).toEqual([]);
    expect(parseUrlOverrides("?sound=1&mute=1", "localhost").overrides.sound).toEqual({ enabled: true, mute: true });
  });

  it("debug params: invalid values are reported, not applied", () => {
    const { overrides, warnings } = parseUrlOverrides("?debug=1&sound=yes&soundAzan=gong&vol=120", "masjidview.my");
    expect(overrides.sound).toEqual({});
    expect(warnings).toHaveLength(3);
  });

  it("ignored on a real host without debug=1, and always in the live demo", () => {
    const real = parseUrlOverrides("?sound=1&vol=90", "masjidview.my");
    expect(real.overrides.sound).toBeUndefined();
    expect(real.warnings[0]).toMatch(/ignored sound, vol/);
    const demo = parseUrlOverrides("?demo=1&sound=1&mute=1", "masjidview.my");
    expect(demo.overrides.sound).toBeUndefined();
    expect(demo.warnings).toEqual(["ignored sound, mute (the demo never plays sound)"]);
  });
});
