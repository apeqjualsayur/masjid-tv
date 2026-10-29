// Contract rule 20: every theme's full layout shows the ticker; the poster layout never does.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildDisplayState, parseLocalDateTime, type DisplayInputs } from "@/core";
import { CONFIG, dayTimes } from "@/core/__fixtures__/sgr01-2026-10";
import { sampleSlide } from "@/templates";
import { availableThemes, getTheme } from "./registry";
import { tickerNow } from "./shared/ticker";
import { ThemeView } from "./ThemeView";

const state = (extra: Partial<DisplayInputs> = {}) =>
  buildDisplayState({
    at: parseLocalDateTime("2026-10-17T10:00:00")!,
    today: dayTimes(17),
    tomorrowImsak: dayTimes(18).times.imsak,
    tomorrowSubuh: dayTimes(18).times.subuh,
    clock24h: false,
    showArabic: true,
    ticker: ["Kuliah Maghrib malam ini bersama Ustaz Ahmad"],
    lite: false,
    masjid: { fullName: "Masjid Al-Hidayah", shortName: "AH" },
    modeConfig: CONFIG,
    ...extra,
  });

describe.each(availableThemes())("%s ticker (rule 20)", (id) => {
  const theme = getTheme(id).theme;
  it("full layout shows the ticker text, also in lite", () => {
    for (const lite of [false, true]) {
      expect(renderToStaticMarkup(<ThemeView theme={theme} s={state({ lite })} layout="full" />)).toContain("Kuliah Maghrib malam ini bersama Ustaz Ahmad");
    }
  });

  it("nothing when the ticker is empty; never in the poster layout", () => {
    expect(renderToStaticMarkup(<ThemeView theme={theme} s={state({ ticker: [] })} layout="full" />)).not.toContain("data-ticker");
    const poster = renderToStaticMarkup(<ThemeView theme={theme} s={state({ layout: "poster" })} layout="poster" slide={sampleSlide("kuliah")} />);
    expect(poster).not.toContain("Kuliah Maghrib malam ini bersama Ustaz Ahmad");
  });
});

describe("tickerNow", () => {
  it("one item at a time, changing every 12 s, skipping blank items", () => {
    const at = (ms: number) => ({ ticker: ["A", " ", "B"], now: new Date(ms) });
    expect(tickerNow(at(0))).toBe("A");
    expect(tickerNow(at(12_000))).toBe("B");
    expect(tickerNow(at(24_000))).toBe("A");
    expect(tickerNow({ ticker: [], now: new Date(0) })).toBe("");
  });
});
