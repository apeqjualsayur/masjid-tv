// PRD themes round 2: ids, unknown-value fallback (D7) and the lazy theme registry (D8).
import { afterEach, describe, expect, it } from "vitest";
import { THEME_IDS, type ThemeId } from "@/core";
import { parseBundleAnswer } from "@/data/bundle";
import { bundleToScreenConfig } from "@/app/(ms)/tv/bundle-config";
import { parseUrlOverrides } from "@/app/(ms)/tv/config";
import { loadTheme, resetThemeCache, resolveThemeId } from "./index";
import { getTheme } from "./registry";
import type { ThemeDefinition } from "./types";

const okAnswer = (theme: unknown, layout: unknown) => ({
  status: "ok",
  version: 3,
  screen: { id: "scr-1", name: "TV 2", theme, layout },
  org: { fullName: "Masjid Al-Hidayah", shortName: "Al-Hidayah", kind: "masjid", zone: "SGR01", accentColor: null, logoPath: null },
  settings: { iqamahMin: {}, durations: {}, clock24h: false, showArabic: true, ticker: [] },
  slides: [],
});
const screenOf = (theme: unknown, layout: unknown) => {
  const a = parseBundleAnswer(okAnswer(theme, layout));
  if (a.kind !== "ok") throw new Error(a.kind);
  return a.bundle.screen;
};

describe("bundle theme / layout validation (D7)", () => {
  it("accepts all 7 themes and 4 layouts", () => {
    for (const t of THEME_IDS) expect(screenOf(t, "full").theme).toBe(t);
    for (const l of ["full", "bottom", "side", "poster"]) expect(screenOf("tenang", l).layout).toBe(l);
  });

  it("unknown, missing or wrong-type values → tenang / full, never invalid", () => {
    for (const bad of ["banana", "", null, undefined, 7, "Falak", "falak "]) {
      expect(screenOf(bad, "bottom").theme).toBe("tenang");
      expect(screenOf("alam", bad).layout).toBe("full");
    }
    expect(parseBundleAnswer(okAnswer("banana", "carousel")).kind).toBe("ok");
  });

  it("a bundle stored by an older app with an unknown id still maps to tenang / full", () => {
    const a = parseBundleAnswer(okAnswer("alam", "side"));
    if (a.kind !== "ok") throw new Error(a.kind);
    const stale = { ...a.bundle, screen: { ...a.bundle.screen, theme: "banana", layout: "carousel" } } as unknown as typeof a.bundle;
    const { config, warnings } = bundleToScreenConfig(stale, "https://x.supabase.co");
    expect(config.theme).toBe("tenang");
    expect(config.layout).toBe("full");
    expect(warnings.join(" ")).toMatch(/theme "banana" unknown.*layout "carousel" unknown/);
  });
});

describe("debug params", () => {
  it("theme accepts the 4 new ids, layout accepts poster", () => {
    for (const t of ["falak", "garis", "kerawang", "seterusnya"]) {
      expect(parseUrlOverrides(`?debug=1&theme=${t}`, "masjid.example").overrides.theme).toBe(t);
    }
    expect(parseUrlOverrides("?debug=1&layout=poster", "masjid.example").overrides.layout).toBe("poster");
  });

  it("unknown values fall back to tenang / full with a warning", () => {
    const r = parseUrlOverrides("?debug=1&theme=banana&layout=carousel", "masjid.example");
    expect(r.overrides).toMatchObject({ theme: "tenang", layout: "full" });
    expect(r.warnings.join(" ")).toMatch(/theme=banana unknown.*layout=carousel unknown/);
  });
});

describe("theme registry", () => {
  afterEach(() => resetThemeCache());

  it("resolveThemeId: known ids pass, anything else → tenang with a warning", () => {
    expect(resolveThemeId("kerawang")).toEqual({ id: "kerawang" });
    expect(resolveThemeId("banana")).toMatchObject({ id: "tenang", warning: expect.stringContaining("banana") });
    expect(resolveThemeId(undefined).id).toBe("tenang");
  });

  it("every id loads lazily to a theme with that id (new ids are placeholders for now)", async () => {
    for (const id of THEME_IDS) {
      const t = await loadTheme(id);
      expect(t.id).toBe(id);
      expect(Object.keys(t.layouts).sort()).toEqual(["bottom", "full", "poster", "side"]);
      expect(getTheme(id).theme.id).toBe(id);
    }
  });

  it("loads each theme once; a failed load (offline) is retried on the next call", async () => {
    let calls = 0;
    let online = false;
    const fake = { id: "garis" } as ThemeDefinition;
    const loaders = Object.fromEntries(THEME_IDS.map((id) => [id, async () => {
      calls++;
      if (!online) throw new Error("offline");
      return fake;
    }])) as Record<ThemeId, () => Promise<ThemeDefinition>>;
    await expect(loadTheme("garis", loaders)).rejects.toThrow("offline");
    await Promise.resolve();
    online = true;
    await expect(loadTheme("garis", loaders)).resolves.toBe(fake);
    await loadTheme("garis", loaders);
    expect(calls).toBe(2);
  });
});
