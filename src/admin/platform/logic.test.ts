import { describe, expect, it } from "vitest";
import { TAB_QUERY, VIEW_TABS, actionsFor, countByTab, filterOrgs, formatBytes, reasonError, tabFromQuery, tabOf, totals, type PlatformOrg } from "./logic";

describe("?tab= on /admin/platform", () => {
  it("?tab=penggunaan opens Penggunaan; the org tabs keep working", () => {
    expect(tabFromQuery("penggunaan")).toBe("usage");
    expect(tabFromQuery("usage")).toBe("usage");
    expect(tabFromQuery("active")).toBe("active");
    expect(tabFromQuery("Aktif")).toBe("active");
    expect(tabFromQuery("digantung")).toBe("suspended");
  });

  it("missing or unknown = Menunggu", () => {
    expect(tabFromQuery(null)).toBe("pending");
    expect(tabFromQuery("")).toBe("pending");
    expect(tabFromQuery("nonsense")).toBe("pending");
  });

  it("every tab's query value leads back to it", () => {
    for (const t of VIEW_TABS) expect(tabFromQuery(TAB_QUERY[t])).toBe(t);
  });
});

let n = 0;
function org(over: Partial<PlatformOrg>): PlatformOrg {
  n++;
  return {
    id: `o${n}`, kind: "masjid", full_name: `Masjid ${n}`, short_name: `M${n}`, state: "Selangor", district: "Gombak", zone: "SGR01",
    address: null, contact_phone: "012-345 6789", logo_path: null, accent_color: "#146C4A", status: "active", status_reason: null,
    created_at: `2026-10-${String(10 + n).padStart(2, "0")}T02:00:00Z`, reviewed_at: null, registrant_email: `a${n}@example.com`,
    screens_total: 0, screens_online: 0, storage_bytes: 0, ...over,
  };
}

describe("platform tabs and actions", () => {
  it("rejected registrations are listed with suspended ones", () => {
    expect(tabOf("pending")).toBe("pending");
    expect(tabOf("active")).toBe("active");
    expect(tabOf("suspended")).toBe("suspended");
    expect(tabOf("rejected")).toBe("suspended");
  });
  it("actions per status (PRD §4.3)", () => {
    expect(actionsFor("pending")).toEqual(["reject", "approve"]);
    expect(actionsFor("active")).toEqual(["suspend"]);
    expect(actionsFor("suspended")).toEqual(["reactivate"]);
    expect(actionsFor("rejected")).toEqual(["reactivate"]);
  });
  it("reject and suspend need a reason", () => {
    expect(reasonError("reject", "  ")).toBe("platform.reasonRequired");
    expect(reasonError("suspend", "")).toBe("platform.reasonRequired");
    expect(reasonError("suspend", "x".repeat(501))).toBe("platform.reasonTooLong");
    expect(reasonError("reject", "Butiran tidak lengkap")).toBeNull();
    expect(reasonError("approve", "")).toBeNull();
    expect(reasonError("reactivate", "")).toBeNull();
  });
});

describe("header totals", () => {
  const list = [
    org({ status: "active", screens_total: 3, screens_online: 2, storage_bytes: 1_500_000 }),
    org({ status: "active", screens_total: 1, screens_online: 0, storage_bytes: 250_000 }),
    org({ status: "pending", storage_bytes: 20_000 }),
    org({ status: "pending" }),
    org({ status: "suspended", screens_total: 2, screens_online: 2, storage_bytes: 5_000 }),
    org({ status: "rejected" }),
  ];
  it("counts active, pending, screens of active masjids and all storage", () => {
    expect(totals(list)).toEqual({ active: 2, pending: 2, screensOnline: 2, screensTotal: 4, storageBytes: 1_775_000 });
  });
  it("counts per tab", () => {
    expect(countByTab(list)).toEqual({ pending: 2, active: 2, suspended: 2 });
  });
  it("empty list", () => {
    expect(totals([])).toEqual({ active: 0, pending: 0, screensOnline: 0, screensTotal: 0, storageBytes: 0 });
  });
});

describe("filterOrgs", () => {
  const a = org({ status: "pending", full_name: "Surau Al-Hidayah", district: "Petaling", created_at: "2026-10-19T00:00:00Z" });
  const b = org({ status: "pending", full_name: "Masjid Jamek", zone: "WLY01", state: "Wilayah Persekutuan", created_at: "2026-10-18T00:00:00Z", registrant_email: "ajk@jamek.my" });
  const c = org({ status: "active", full_name: "Masjid Aktif" });
  it("pending tab shows oldest first", () => {
    expect(filterOrgs([a, b, c], "pending", "").map((o) => o.id)).toEqual([b.id, a.id]);
  });
  it("searches name, area, zone and e-mail", () => {
    expect(filterOrgs([a, b, c], "pending", "hidayah").map((o) => o.id)).toEqual([a.id]);
    expect(filterOrgs([a, b, c], "pending", "wly01").map((o) => o.id)).toEqual([b.id]);
    expect(filterOrgs([a, b, c], "pending", "jamek.my").map((o) => o.id)).toEqual([b.id]);
    expect(filterOrgs([a, b, c], "active", "petaling")).toEqual([]);
  });
});

describe("formatBytes", () => {
  it("formats like Supabase usage (1000-based)", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(850)).toBe("850 B");
    expect(formatBytes(850_000, "en-MY")).toBe("850 KB");
    expect(formatBytes(12_400_000, "en-MY")).toBe("12.4 MB");
    expect(formatBytes(1_234_567_890, "en-MY")).toBe("1.2 GB");
    expect(formatBytes(-5)).toBe("0 B");
  });
});