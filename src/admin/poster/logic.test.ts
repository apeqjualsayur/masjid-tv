import { describe, expect, it } from "vitest";
import { SLOTS, fileError, fitOn, layoutAdvice, outputSize, recommendedRows, resolutionCheck, shapeOf } from "./logic";

describe("file checks (PRD §6)", () => {
  it("JPG/PNG/WebP up to 10 MB", () => {
    expect(fileError("image/jpeg", 2_400_000)).toBeNull();
    expect(fileError("image/png", 10 * 1024 * 1024)).toBeNull();
    expect(fileError("image/webp", 1)).toBeNull();
    expect(fileError("image/heic", 100)).toBe("poster.err.type");
    expect(fileError("application/pdf", 100)).toBe("poster.err.type");
    expect(fileError("image/jpeg", 10 * 1024 * 1024 + 1)).toBe("poster.err.tooBig");
    expect(fileError("image/jpeg", 0)).toBe("poster.err.empty");
  });
  it("shape and output size (long edge ≤ 1920, never enlarged)", () => {
    expect(shapeOf(1920, 800)).toBe("landscape");
    expect(shapeOf(1080, 1350)).toBe("portrait");
    expect(shapeOf(1000, 1000)).toBe("square");
    expect(outputSize(4000, 3000)).toEqual({ w: 1920, h: 1440 });
    expect(outputSize(3000, 4000)).toEqual({ w: 1440, h: 1920 });
    expect(outputSize(1080, 1350)).toEqual({ w: 1080, h: 1350 });
  });
});

describe("fit per layout (coverage = shown area ÷ poster area)", () => {
  it("exact recommended sizes fill the area", () => {
    expect(fitOn(1920, 800, "bottom")).toMatchObject({ label: "full", scale: 1 });
    expect(fitOn(1920, 800, "bottom").coverage).toBeCloseTo(1);
    expect(fitOn(1350, 1080, "side").label).toBe("full");
  });
  it("a portrait A4/WhatsApp poster: small in the bottom bar, blurred sides in the side bar", () => {
    const b = fitOn(1080, 1350, "bottom");
    expect(b.label).toBe("small");
    expect(b.coverage).toBeCloseTo((640 / 1920) * 1, 2);
    expect(b.box.y).toBeCloseTo(0);
    const s = fitOn(1080, 1350, "side");
    expect(s.label).toBe("blur");
    expect(s.coverage).toBeCloseTo(864 / 1350, 3);
  });
  it("bands: ≥ 85 % full, 50–85 % blur, < 50 % small", () => {
    // 1920×960 in 1920×800: shown 1600×800 → 83 %
    expect(fitOn(1920, 960, "bottom").label).toBe("blur");
    // 1920×880: shown 1745×800 → 91 %
    expect(fitOn(1920, 880, "bottom").label).toBe("full");
  });
  it("box is centred", () => {
    const f = fitOn(1080, 1350, "side");
    expect(f.box.x + f.box.w / 2).toBeCloseTo(0.5);
    expect(f.box.h).toBeCloseTo(1);
  });
});

describe("resolution warning", () => {
  it("640×800 WhatsApp picture: enlarged 1.35× on a side bar (under 1.4×) but too narrow, so warned", () => {
    const r = resolutionCheck(640, 800, ["bottom", "side"]);
    expect(r).toMatchObject({ ok: false, upscaled: false, lowWidth: true });
    expect(r.maxScale).toBeCloseTo(1.35, 2);
    expect(resolutionCheck(500, 625, ["side"])).toMatchObject({ upscaled: true, lowWidth: true });
  });
  it("upscale is judged per target layout", () => {
    // 900×500 → bottom: min(2.13, 1.6) = 1.6 (> 1.4)
    expect(resolutionCheck(1200, 500, ["bottom"])).toMatchObject({ upscaled: true, lowWidth: false });
    expect(resolutionCheck(1920, 800, ["bottom", "side"])).toMatchObject({ ok: true, upscaled: false });
    expect(resolutionCheck(1080, 1350, ["side"]).ok).toBe(true);
  });
  it("no poster screens yet: checks both poster layouts", () => {
    // bottom: scale 1; side: min(1350/1920, 1080/800) = 0.70 → largest 1
    expect(resolutionCheck(1920, 800, []).maxScale).toBe(1);
    expect(resolutionCheck(800, 1000, []).maxScale).toBeCloseTo(1.08, 2);
  });
});

describe("advice and recommended rows", () => {
  it("a bottom-bar poster fits only the bottom layout well", () => {
    expect(layoutAdvice(1920, 800, ["bottom", "side", "side"])).toEqual({ good: ["bottom"], weak: ["side"] });
    expect(layoutAdvice(1350, 1000, ["bottom", "side"])).toEqual({ good: ["side"], weak: ["bottom"] });
  });
  it("one row per non-revoked screen; full layout = not shown, listed last", () => {
    const rows = recommendedRows([
      { id: "1", name: "Pintu Masuk", theme: "tenang", layout: "full" },
      { id: "2", name: "Serambi Wanita", theme: "alam", layout: "side" },
      { id: "3", name: "Dewan Solat Utama", theme: "serambi", layout: "bottom" },
      { id: "4", name: "Lama", theme: "alam", layout: "bottom", revoked_at: "2026-10-01" },
    ]);
    expect(rows.map((r) => [r.screen.name, r.slot])).toEqual([
      ["Dewan Solat Utama", SLOTS.bottom],
      ["Serambi Wanita", SLOTS.side],
      ["Pintu Masuk", null],
    ]);
  });
});
describe("Pengumuman sahaja (poster layout, 16:9 area, round 2 §6)", () => {
  it("recommended size 1920×1080; a 16:9 picture fills it", () => {
    expect(SLOTS.poster).toEqual({ w: 1920, h: 1080 });
    expect(fitOn(1920, 1080, "poster")).toMatchObject({ label: "full", scale: 1 });
    expect(fitOn(1920, 800, "poster").label).toBe("blur"); // a 12:5 bottom-bar poster covers 74 % of 16:9
  });
  it("fit labels use the 16:9 area", () => {
    // 1080×1350 portrait in 1920×1080: shown 864×1080 → 45 % → small
    expect(fitOn(1080, 1350, "poster").label).toBe("small");
    // 1350×1080 (5:4) → 1350×1080 shown, 70 % → blur
    expect(fitOn(1350, 1080, "poster").label).toBe("blur");
  });
  it("low-resolution warning judges the 16:9 area", () => {
    // 1280×720 → enlarged 1.5× on the poster screen (> 1.4)
    expect(resolutionCheck(1280, 720, ["poster"])).toMatchObject({ upscaled: true, ok: false });
    expect(resolutionCheck(1280, 720, ["bottom"]).upscaled).toBe(false); // only 1.11× in the 12:5 area
    expect(resolutionCheck(1920, 1080, ["poster"]).ok).toBe(true);
  });
  it("a poster screen is listed with its 16:9 slot", () => {
    const rows = recommendedRows([{ id: "1", name: "TV 2", theme: "garis", layout: "poster" }]);
    expect(rows[0].slot).toEqual({ w: 1920, h: 1080 });
  });
});
