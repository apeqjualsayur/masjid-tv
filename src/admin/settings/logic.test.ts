import { describe, expect, it, vi } from "vitest";
import type { LogoFile } from "../register/logic";
import { dayTimes } from "@/core/__fixtures__/sgr01-2026-10";
import { SWATCHES, changedDurations, cleanTicker, fridayExample, mergeDurations, readDurations, readIqamah, removeLogo, replaceLogo, stepIqamah, stepJumaatSolat, stepKhutbah, thisFridayKey, type LogoBackend } from "./logic";

describe("swatches", () => {
  it("5 accent colours that the schema accepts", () => {
    expect(SWATCHES).toHaveLength(5);
    for (const s of SWATCHES) expect(s.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(SWATCHES[0].color).toBe("#146C4A");
  });
});

describe("iqamah and khutbah", () => {
  it("reads the row with defaults and clamps out-of-range values", () => {
    expect(readIqamah({ subuh: 12, maghrib: 99, asar: 0 })).toEqual({ subuh: 12, zohor: 10, asar: 1, maghrib: 30, isyak: 10 });
    expect(readIqamah(null)).toEqual({ subuh: 10, zohor: 10, asar: 10, maghrib: 7, isyak: 10 });
  });
  it("steppers stay within 1 to 30", () => {
    const v = readIqamah({ subuh: 1, isyak: 30 });
    expect(stepIqamah(v, "subuh", -1).subuh).toBe(1);
    expect(stepIqamah(v, "subuh", 1).subuh).toBe(2);
    expect(stepIqamah(v, "isyak", 1).isyak).toBe(30);
  });
  it("khutbah steps by 5 between 10 and 60 (PRD 4.6), other durations kept", () => {
    const d = readDurations({ preAzanMin: 6, khutbahMin: 40 });
    expect(stepKhutbah(d, 1)).toEqual({ preAzanMin: 6, azanMin: 3, solatMin: 12, khutbahMin: 45, jumaatSolatMin: 12, showFridayInfo: true });
    expect(stepKhutbah({ ...d, khutbahMin: 60 }, 1).khutbahMin).toBe(60);
    expect(stepKhutbah({ ...d, khutbahMin: 10 }, -1).khutbahMin).toBe(10);
  });
});

describe("cleanTicker (max 5 lines x 140 characters)", () => {
  it("trims, collapses spaces and drops empty lines", () => {
    expect(cleanTicker(["  Kuliah   Maghrib malam ini ", "", "   "])).toEqual({ lines: ["Kuliah Maghrib malam ini"], error: null });
  });
  it("rejects more than 5 lines or a line over 140 characters", () => {
    expect(cleanTicker(["a", "b", "c", "d", "e", "f"]).error).toBe("settings.err.tickerLines");
    expect(cleanTicker(["x".repeat(140)]).error).toBeNull();
    expect(cleanTicker(["x".repeat(141)]).error).toBe("settings.err.tickerLength");
  });
});

function backend(over: Partial<LogoBackend> = {}) {
  const calls: string[] = [];
  const b: LogoBackend = {
    uploadObject: vi.fn(async (p: string) => void calls.push(`upload ${p}`)),
    insertMedia: vi.fn(async (r) => void calls.push(`media ${r.path}`)),
    setOrgLogo: vi.fn(async (_o: string, p: string | null) => void calls.push(`set_org_logo ${p}`)),
    deleteMedia: vi.fn(async (p: string) => void calls.push(`delete media ${p}`)),
    removeObject: vi.fn(async (p: string) => void calls.push(`remove ${p}`)),
    ...over,
  };
  return { b, calls };
}
const logo: LogoFile = { blob: new Blob([new Uint8Array(10)], { type: "image/webp" }), width: 512, height: 512, ext: "webp" };

describe("replaceLogo", () => {
  it("sets the new logo first, then deletes the old row and file", async () => {
    const { b, calls } = backend();
    expect(await replaceLogo(b, "org", logo, "org/old.webp", () => "new")).toEqual({ path: "org/new.webp", oldRemoved: true });
    expect(calls).toEqual(["upload org/new.webp", "media org/new.webp", "set_org_logo org/new.webp", "delete media org/old.webp", "remove org/old.webp"]);
  });
  it("first logo: nothing to delete", async () => {
    const { b, calls } = backend();
    await replaceLogo(b, "org", logo, null, () => "new");
    expect(calls).toEqual(["upload org/new.webp", "media org/new.webp", "set_org_logo org/new.webp"]);
  });
  it("if set_org_logo fails the new file is removed and the old logo is kept", async () => {
    const { b, calls } = backend({ setOrgLogo: vi.fn(async () => Promise.reject({ message: "not_allowed" })) });
    await expect(replaceLogo(b, "org", logo, "org/old.webp", () => "new")).rejects.toEqual({ message: "not_allowed" });
    expect(calls).toEqual(["upload org/new.webp", "media org/new.webp", "delete media org/new.webp", "remove org/new.webp"]);
  });
  it("a failed upload changes nothing", async () => {
    const { b, calls } = backend({ uploadObject: vi.fn(async () => Promise.reject(new Error("413"))) });
    await expect(replaceLogo(b, "org", logo, "org/old.webp", () => "new")).rejects.toThrow("413");
    expect(calls).toEqual([]);
  });
  it("a failed old-file delete is reported, not thrown", async () => {
    const { b } = backend({ removeObject: vi.fn(async () => Promise.reject(new Error("x"))) });
    expect(await replaceLogo(b, "org", logo, "org/old.webp", () => "new")).toEqual({ path: "org/new.webp", oldRemoved: false });
  });
});

describe("removeLogo", () => {
  it("clears logo_path before deleting the file", async () => {
    const { b, calls } = backend();
    expect(await removeLogo(b, "org", "org/old.webp")).toEqual({ oldRemoved: true });
    expect(calls).toEqual(["set_org_logo null", "delete media org/old.webp", "remove org/old.webp"]);
  });
});
describe("Jumaat settings", () => {
  const base = readDurations({ preAzanMin: 5, azanMin: 3, solatMin: 12, khutbahMin: 40 });
  it("khutbah 10-60 in steps of 5, Solat Jumaat 5-30", () => {
    expect(stepKhutbah({ ...base, khutbahMin: 60 }, 1).khutbahMin).toBe(60);
    expect(stepKhutbah({ ...base, khutbahMin: 10 }, -1).khutbahMin).toBe(10);
    expect(stepJumaatSolat(base, 1).jumaatSolatMin).toBe(13);
    expect(stepJumaatSolat({ ...base, jumaatSolatMin: 30 }, 1).jumaatSolatMin).toBe(30);
    expect(stepJumaatSolat({ ...base, jumaatSolatMin: 5 }, -1).jumaatSolatMin).toBe(5);
  });
  it("saving merges only the changed keys into the row, keeping keys it does not know", () => {
    const next = stepJumaatSolat(base, 1);
    const changed = changedDurations(base, next);
    expect(changed).toEqual({ jumaatSolatMin: 13 });
    expect(mergeDurations({ preAzanMin: 7, khutbahMin: 45, future: "x" }, changed)).toEqual({ preAzanMin: 7, khutbahMin: 45, future: "x", jumaatSolatMin: 13 });
    expect(mergeDurations(null, { showFridayInfo: false })).toEqual({ showFridayInfo: false });
  });
  it("this Friday: today when Friday, else the next one", () => {
    expect(thisFridayKey("2026-10-23")).toBe("2026-10-23");
    expect(thisFridayKey("2026-10-24")).toBe("2026-10-30");
    expect(thisFridayKey("2026-10-29")).toBe("2026-10-30");
  });
  it("example line from that Friday's Zohor", () => {
    const day = dayTimes(16);
    expect(fridayExample(day, base, false)?.join(" \u00b7 ")).toBe("Azan 1:02 \u00b7 Khutbah 1:05 (\u00b140 minit) \u00b7 Solat \u00b11:45");
    expect(fridayExample(day, { ...base, khutbahMin: 30, showFridayInfo: false }, true)?.join(" \u00b7 ")).toBe("Azan 13:02 \u00b7 Khutbah 13:05 (\u00b130 minit) \u00b7 Solat \u00b113:35");
  });
});
