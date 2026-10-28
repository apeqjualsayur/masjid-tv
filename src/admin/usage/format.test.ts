import { describe, expect, it } from "vitest";
import { cycleLastDay, fmtBytes, fmtDayMonth, fmtMonthYear, fmtPct, fmtTime, fmtValue } from "./format";

const L = "en-MY";

describe("usage formatting", () => {
  it("bytes are decimal, like Supabase's usage page", () => {
    expect(fmtBytes(41.6e6, L)).toBe("41.6 MB");
    expect(fmtBytes(286e6, L)).toBe("286 MB");
    expect(fmtBytes(2.0412e9, L)).toBe("2.04 GB");
    expect(fmtBytes(12.4e9, L)).toBe("12 GB");
    expect(fmtBytes(0, L)).toBe("0.0 MB");
  });

  it("values per unit", () => {
    expect(fmtValue(58 / 60, "rps", L)).toBe("0.97 /s");
    expect(fmtValue(50000, "count", L)).toBe("50,000");
    expect(fmtValue(5e9, "bytes", L)).toBe("5.00 GB");
  });

  it("percent: one decimal below 1 %", () => {
    expect(fmtPct(0.12, L)).toBe("0.1");
    expect(fmtPct(0, L)).toBe("0");
    expect(fmtPct(74.4, L)).toBe("74");
  });

  it("dates and times (Malaysian time)", () => {
    expect(fmtMonthYear("2027-06-09", L)).toMatch(/Jun.*2027/);
    expect(fmtDayMonth("2026-10-01", L)).toMatch(/1.*Oct/);
    expect(cycleLastDay("2026-11-01")).toBe("2026-10-31");
    expect(fmtTime("2026-10-28T02:00:00Z", L)).toBe("10:00");
  });
});
