import { describe, expect, it } from "vitest";
import { isFridayDate } from "@/core";
import type { YearFile } from "@/data";
import file from "../../public/data/WLY01-2026.json";
import { heroDay, heroState } from "./hero-data";
import { DAY_OFFSETS, SHOWCASE_DATE, THEME_TIMES } from "./showcase";

describe("landing showcase times", () => {
  it("the Satu hari tiles are the engine's real modes, in design order (no forcing)", async () => {
    expect(isFridayDate(SHOWCASE_DATE)).toBe(false);
    const day = await heroDay(file as unknown as YearFile, SHOWCASE_DATE);
    if (day.status !== "ok") throw new Error("no data");
    const modes = DAY_OFFSETS.map((m) => heroState(day, day.today.times.zohor + m * 60_000, false)!.mode);
    expect(modes).toEqual(["normal", "pre_azan", "azan", "iqamah", "solat"]);
  });

  it("Tema uses the fixed times from the PRD", () => {
    expect(THEME_TIMES.map((t) => `${t.id} ${t.hour}:${String(t.minute).padStart(2, "0")}`)).toEqual(["tenang 13:20", "serambi 19:15", "alam 19:06"]);
  });
});