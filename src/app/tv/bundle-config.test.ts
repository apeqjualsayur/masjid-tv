import { describe, expect, it } from "vitest";
import { parseBundleAnswer } from "@/data/bundle";
import { bundleToScreenConfig } from "./bundle-config";

const SB = "https://abc.supabase.co";
function bundle(org: Record<string, unknown> = {}, screen: Record<string, unknown> = {}, settings: Record<string, unknown> = {}) {
  const a = parseBundleAnswer({
    status: "ok",
    version: 3,
    screen: { id: "s", name: "Dewan", theme: "tenang", layout: "side", ...screen },
    org: { fullName: "Masjid Al-Hidayah", shortName: "Al-Hidayah", kind: "masjid", zone: "WLY01", accentColor: "#8A2A4A", logoPath: "org/logo.webp", ...org },
    settings: { iqamahMin: { subuh: 12, zohor: 10, asar: 10, maghrib: 9, isyak: 10 }, durations: { preAzanMin: 5, azanMin: 3, solatMin: 12, khutbahMin: 45 }, clock24h: true, showArabic: false, ticker: ["Satu", "Dua"], ...settings },
    slides: [],
  });
  if (a.kind !== "ok") throw new Error("fixture");
  return a.bundle;
}

describe("bundleToScreenConfig", () => {
  it("maps every setting the engine and themes use", () => {
    const { config, accentColor, warnings } = bundleToScreenConfig(bundle(), SB);
    expect(warnings).toEqual([]);
    expect(config).toEqual({
      masjid: { fullName: "Masjid Al-Hidayah", shortName: "Al-Hidayah", logo: `${SB}/storage/v1/object/public/media/org/logo.webp` },
      zone: "WLY01",
      theme: "tenang",
      layout: "side",
      clock24h: true,
      showArabic: false,
      durations: { preAzanMin: 5, azanMin: 3, solatMin: 12, khutbahMin: 45, jumaatSolatMin: 12, showFridayInfo: true }, // old bundle without the Friday keys: defaults
      iqamahMin: { subuh: 12, zohor: 10, asar: 10, maghrib: 9, isyak: 10 },
      ticker: ["Satu", "Dua"],
    });
    expect(accentColor).toBe("#8A2A4A");
  });

  it("passes the Friday settings through; bad values fall back to the defaults with a warning", () => {
    const set = (durations: Record<string, unknown>) => bundleToScreenConfig(bundle({}, {}, { durations: { preAzanMin: 5, azanMin: 3, solatMin: 12, khutbahMin: 30, ...durations } }), SB);
    const ok = set({ jumaatSolatMin: 20, showFridayInfo: false });
    expect(ok.warnings).toEqual([]);
    expect(ok.config.durations).toEqual({ preAzanMin: 5, azanMin: 3, solatMin: 12, khutbahMin: 30, jumaatSolatMin: 20, showFridayInfo: false });
    const bad = set({ jumaatSolatMin: "lima", showFridayInfo: "ya" });
    expect(bad.config.durations.jumaatSolatMin).toBe(12);
    expect(bad.config.durations.showFridayInfo).toBe(true);
    expect(bad.warnings).toEqual(["bundle: durations.jumaatSolatMin invalid; using 12", "bundle: durations.showFridayInfo invalid; using true"]);
  });

  it("no logo means no logo (never the sample logo); empty ticker stays empty", () => {
    const { config } = bundleToScreenConfig(bundle({ logoPath: null }, {}, { ticker: [] }), SB);
    expect(config.masjid.logo).toBeUndefined();
    expect(config.ticker).toEqual([]);
  });

  it("bad values fall back to safe defaults with warnings", () => {
    const { config, accentColor, warnings } = bundleToScreenConfig(bundle({ accentColor: "red" }, { theme: "neon", layout: "diagonal" }, { iqamahMin: { subuh: -4 } }), SB);
    expect(config.theme).toBe("alam");
    expect(config.layout).toBe("full");
    expect(config.iqamahMin.subuh).toBe(10);
    expect(accentColor).toBeNull();
    expect(warnings.length).toBeGreaterThanOrEqual(3);
    expect(warnings.every((w) => w.startsWith("bundle: "))).toBe(true);
  });
});