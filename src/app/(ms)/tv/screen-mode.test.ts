// Full-screen plan (phases 2–3b): how the TV page is shown, and the daily restart decision.
import { afterEach, describe, expect, it, vi } from "vitest";
import { localToEpoch } from "@/core";
import { dailyRestart } from "./hooks";
import { viewMode } from "./screen-mode";

const page = (o: { fullscreenElement?: object | null; displayMode?: string; inner: [number, number]; screen: [number, number] }) => {
  vi.stubGlobal("document", { fullscreenElement: o.fullscreenElement ?? null });
  vi.stubGlobal("window", { innerWidth: o.inner[0], innerHeight: o.inner[1] });
  vi.stubGlobal("screen", { width: o.screen[0], height: o.screen[1] });
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: o.displayMode !== undefined && q.includes(o.displayMode) }));
};
afterEach(() => vi.unstubAllGlobals());

describe("view mode", () => {
  it("full screen by a key press → tab (lost on reload)", () => {
    page({ fullscreenElement: {}, inner: [1920, 1080], screen: [1920, 1080] });
    expect(viewMode()).toBe("tab");
  });
  it("installed app, or a kiosk browser filling the screen → app", () => {
    page({ displayMode: "fullscreen", inner: [1920, 1080], screen: [1920, 1080] });
    expect(viewMode()).toBe("app");
    page({ inner: [960, 540], screen: [960, 540] });
    expect(viewMode()).toBe("app");
  });
  it("browser bars visible → window", () => {
    page({ inner: [1920, 960], screen: [1920, 1080] });
    expect(viewMode()).toBe("window");
  });
});

describe("daily restart at 3:00 am (plan 3b)", () => {
  const at = (h: number, m: number) => localToEpoch(2026, 10, 31, h, m, 30);
  it("reloads a TV that is not kept full screen by a key press", () => {
    expect(dailyRestart(at(3, 0), 10 * 60_000, false)).toBe("reload");
  });
  it("restarts in place when full screen came from a key press", () => {
    expect(dailyRestart(at(3, 0), 10 * 60_000, true)).toBe("soft");
  });
  it("nothing outside 3:00, or within 2 minutes of the last start", () => {
    expect(dailyRestart(at(3, 1), 10 * 60_000, false)).toBeNull();
    expect(dailyRestart(at(15, 0), 10 * 60_000, false)).toBeNull();
    expect(dailyRestart(at(3, 0), 60_000, true)).toBeNull();
  });
});
