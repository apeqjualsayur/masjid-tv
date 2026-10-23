import { describe, expect, it } from "vitest";
import { tryMonogram } from "./monogram";

describe("Cuba sekarang monogram", () => {
  it("first letters of the first two words after Masjid / Surau", () => {
    expect(tryMonogram("Masjid Al-Hidayah")).toBe("A");
    expect(tryMonogram("Masjid Jamek Kampung Baru")).toBe("JK");
    expect(tryMonogram("surau an-nur taman melati")).toBe("AT");
    expect(tryMonogram("  Masjid   Surau  Baitul Rahman ")).toBe("BR");
  });
  it("falls back to MV", () => {
    expect(tryMonogram("")).toBe("MV");
    expect(tryMonogram("Masjid")).toBe("MV");
    expect(tryMonogram("   ")).toBe("MV");
  });
});