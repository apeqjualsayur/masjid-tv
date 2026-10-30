import { describe, expect, it } from "vitest";
import { buildTimeOf, isOutdated, parseLiveVersion } from "@/config/release";
import { adminOutdated, howKey, outdatedScreens, updateNotice, type ScreenVersionRow } from "./logic";

const NOW = Date.parse("2026-10-31T02:00:00Z");
const MIN = "2026-10-30 16:00";
const row = (id: string, app_version: string | null, extra: Partial<ScreenVersionRow> = {}): ScreenVersionRow => ({
  id,
  name: `TV ${id}`,
  app_version,
  view_mode: "window",
  last_seen_at: "2026-10-31T01:00:00Z",
  revoked_at: null,
  ...extra,
});
const live = { version: "0.1.0 (2026-10-30 16:05)", builtAt: "2026-10-30 16:05", minTvBuild: MIN };

describe("release versions", () => {
  it("reads the build time; dev builds are never outdated, unknown ones are", () => {
    expect(buildTimeOf("0.1.0 (2026-10-30 14:15)")).toBe("2026-10-30 14:15");
    expect(buildTimeOf("dev")).toBeNull();
    expect(isOutdated("0.1.0 (2026-10-30 14:15)", MIN)).toBe(true);
    expect(isOutdated("0.1.0 (2026-10-30 16:00)", MIN)).toBe(false);
    expect(isOutdated("dev", MIN)).toBe(false);
    expect(isOutdated(null, MIN)).toBe(true);
    expect(parseLiveVersion({ version: "x" })).toBeNull();
    expect(parseLiveVersion(live)).toEqual(live);
  });
});

describe("update notice", () => {
  it("lists only active TVs seen this week on an older build", () => {
    const rows = [
      row("new", "0.1.0 (2026-10-30 16:05)"),
      row("old", "0.1.0 (2026-10-30 14:15)"),
      row("none", null),
      row("gone", "0.1.0 (2026-10-29 10:00)", { revoked_at: "2026-10-30T00:00:00Z" }),
      row("off", "0.1.0 (2026-10-29 10:00)", { last_seen_at: "2026-10-20T00:00:00Z" }),
      row("never", null, { last_seen_at: null }),
    ];
    expect(outdatedScreens(rows, MIN, NOW).map((s) => s.id)).toEqual(["old", "none"]);
  });

  it("an admin page older than the live site is outdated", () => {
    expect(adminOutdated("0.1.0 (2026-10-30 14:15)", live)).toBe(true);
    expect(adminOutdated("0.1.0 (2026-10-30 16:05)", live)).toBe(false);
    expect(adminOutdated("dev", live)).toBe(false);
    expect(adminOutdated("0.1.0 (2026-10-30 14:15)", null)).toBe(false);
  });

  it("nothing behind: no notice; the live minimum wins over the compiled one", () => {
    const base = { releaseId: "r1", minTvBuild: MIN, adminVersion: live.version, live, now: NOW };
    expect(updateNotice({ ...base, rows: [row("a", live.version)] })).toBeNull();
    const n = updateNotice({ ...base, rows: [row("a", "0.1.0 (2026-10-30 14:15)", { view_mode: "tab" })] })!;
    expect(n.screens.map((s) => s.id)).toEqual(["a"]);
    expect(n.admin).toBe(false);
    expect(updateNotice({ ...base, minTvBuild: "2026-10-29 00:00", live: { ...live, minTvBuild: "2026-10-31 00:00" }, rows: [row("a", live.version)] })?.screens).toHaveLength(1);
  });

  it("the dismiss key changes when another TV falls behind or a newer admin is live", () => {
    const base = { releaseId: "r1", minTvBuild: MIN, adminVersion: live.version, live, now: NOW };
    const one = updateNotice({ ...base, rows: [row("a", null)] })!.key;
    const two = updateNotice({ ...base, rows: [row("a", null), row("b", null)] })!.key;
    const adminToo = updateNotice({ ...base, adminVersion: "0.1.0 (2026-10-30 10:00)", rows: [row("a", null)] })!.key;
    expect(new Set([one, two, adminToo]).size).toBe(3);
  });

  it("instructions follow how the TV is shown", () => {
    expect(howKey("tab")).toBe("update.how.tab");
    expect(howKey("app")).toBe("update.how.app");
    expect(howKey("window")).toBe("update.how.window");
    expect(howKey(null)).toBe("update.how.window");
  });
});
