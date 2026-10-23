import { describe, expect, it } from "vitest";
import { navItems } from "./AdminShell";

const keys = (role: "pentadbir" | null, platform: boolean) => navItems(role, platform).map((n) => n.key);

describe("admin navigation", () => {
  it("a masjid admin sees every masjid page", () => {
    expect(keys("pentadbir", false)).toEqual(["home", "content", "screens", "settings", "members"]);
  });
  it("platform owner with a masjid also gets Platform (sidebar on computer, account sheet on phone)", () => {
    const items = navItems("pentadbir", true);
    expect(items.map((n) => n.key)).toEqual(["home", "content", "screens", "settings", "members", "platform"]);
    expect(items.find((n) => n.key === "platform")?.phone).toBe(false);
  });
  it("platform owner without a masjid sees Platform only, no links that bounce back", () => {
    const items = navItems(null, true);
    expect(items.map((n) => n.key)).toEqual(["platform"]);
    expect(items[0].phone).toBe(true);
  });
  it("no masjid and not platform owner: nothing to show", () => {
    expect(keys(null, false)).toEqual([]);
  });
});