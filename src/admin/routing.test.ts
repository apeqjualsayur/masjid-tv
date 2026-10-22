import { describe, expect, it } from "vitest";
import { ROUTES, canOpen, pickCurrentOrg, routeAfterSignIn, type Membership, type OrgStatus } from "./routing";

const org = (id: string, status: OrgStatus, role: Membership["role"] = "pentadbir"): Membership => ({
  orgId: id, role, status, statusReason: null, fullName: `Masjid ${id}`, shortName: id, kind: "masjid", zone: "SGR01", state: "Selangor", district: "Gombak", logoPath: null, accentColor: "#146C4A",
});

describe("routeAfterSignIn (PRD §4.1)", () => {
  it("no masjid → Daftar; platform owner with no masjid → Platform", () => {
    expect(routeAfterSignIn({ isPlatformAdmin: false, orgs: [] })).toBe(ROUTES.register);
    expect(routeAfterSignIn({ isPlatformAdmin: true, orgs: [] })).toBe(ROUTES.platform);
  });
  it("only pending / rejected / suspended → Menunggu", () => {
    expect(routeAfterSignIn({ isPlatformAdmin: false, orgs: [org("a", "pending")] })).toBe(ROUTES.pending);
    expect(routeAfterSignIn({ isPlatformAdmin: false, orgs: [org("a", "rejected"), org("b", "suspended")] })).toBe(ROUTES.pending);
  });
  it("any active masjid → Utama (also for a platform owner)", () => {
    expect(routeAfterSignIn({ isPlatformAdmin: false, orgs: [org("a", "pending"), org("b", "active")] })).toBe(ROUTES.home);
    expect(routeAfterSignIn({ isPlatformAdmin: true, orgs: [org("b", "active")] })).toBe(ROUTES.home);
  });
});

describe("pickCurrentOrg", () => {
  const orgs = [org("a", "active"), org("b", "active"), org("c", "pending")];
  it("keeps the saved choice when it is still active", () => expect(pickCurrentOrg(orgs, "b")?.orgId).toBe("b"));
  it("falls back to the first active masjid", () => {
    expect(pickCurrentOrg(orgs, "c")?.orgId).toBe("a");
    expect(pickCurrentOrg(orgs, null)?.orgId).toBe("a");
    expect(pickCurrentOrg(orgs, "gone")?.orgId).toBe("a");
  });
  it("none when nothing is active", () => expect(pickCurrentOrg([org("c", "pending")], null)).toBeNull());
});

describe("canOpen (PRD §3)", () => {
  it("Tetapan and Ahli are Pentadbir-only; editors can open the rest", () => {
    expect(canOpen(ROUTES.settings, "editor")).toBe(false);
    expect(canOpen(ROUTES.members, "editor")).toBe(false);
    expect(canOpen(ROUTES.settings, "pentadbir")).toBe(true);
    expect(canOpen(ROUTES.content, "editor")).toBe(true);
    expect(canOpen(ROUTES.screens, "editor")).toBe(true);
  });
});