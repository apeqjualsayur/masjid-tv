import { describe, expect, it } from "vitest";
import fixture from "../../../tests/fixtures/usage-report.json";
import { model } from "../_shared/usage-model";
import type { UsageReport } from "../_shared/usage-types";
import { addPage, alertCandidates, countWindow, digestEmail, escapeHtml, fmtValue, itemLine, myDate, parseResendTime, sameSecret } from "./digest";

const base = fixture as UsageReport;
const report = (change: (r: UsageReport) => void = () => {}) => {
  const r = structuredClone(base);
  change(r);
  return r;
};
const LINK = "https://masjidview.my/admin/platform?tab=penggunaan";

describe("Malaysian days", () => {
  it("myDate is UTC+8", () => {
    expect(myDate(Date.parse("2026-10-27T15:59:59Z"))).toBe("2026-10-27");
    expect(myDate(Date.parse("2026-10-27T16:00:00Z"))).toBe("2026-10-28");
  });

  it("counting starts at 00:00 yesterday, Malaysian time", () => {
    const w = countWindow(Date.parse("2026-10-28T01:30:00Z")); // 09:30 MYT
    expect(w).toEqual({ today: "2026-10-28", yesterday: "2026-10-27", fromMs: Date.parse("2026-10-26T16:00:00Z") });
    expect(countWindow(Date.parse("2026-11-01T00:10:00Z")).yesterday).toBe("2026-10-31");
  });

  it("reads Resend's timestamp format and ISO", () => {
    expect(parseResendTime("2026-10-28 02:13:55.977+00")).toBe(Date.parse("2026-10-28T02:13:55.977Z"));
    expect(parseResendTime("2026-10-28T02:13:55.977Z")).toBe(Date.parse("2026-10-28T02:13:55.977Z"));
    expect(parseResendTime("nonsense")).toBeNaN();
  });
});

describe("addPage (Resend list, newest first)", () => {
  const from = Date.parse("2026-10-26T16:00:00Z");
  const e = (id: string, t: string) => ({ id, created_at: t });

  it("groups by Malaysian day and continues after the last id", () => {
    const counts: Record<string, number> = {};
    const next = addPage(counts, { has_more: true, data: [e("a", "2026-10-28 01:00:00+00"), e("b", "2026-10-27 17:00:00+00"), e("c", "2026-10-27 10:00:00+00")] }, from);
    expect(counts).toEqual({ "2026-10-28": 2, "2026-10-27": 1 });
    expect(next).toBe("c");
  });

  it("stops at the first email before 00:00 yesterday and does not count it", () => {
    const counts: Record<string, number> = {};
    const next = addPage(counts, { has_more: true, data: [e("a", "2026-10-26 16:00:00+00"), e("b", "2026-10-26 15:59:59+00")] }, from);
    expect(counts).toEqual({ "2026-10-27": 1 });
    expect(next).toBeNull();
  });

  it("stops when there are no more pages or no rows", () => {
    expect(addPage({}, { has_more: false, data: [e("a", "2026-10-28 01:00:00+00")] }, from)).toBeNull();
    expect(addPage({}, { has_more: true, data: [] }, from)).toBeNull();
    expect(addPage({}, {}, from)).toBeNull();
  });
});

describe("alert candidates", () => {
  it("every warn/crit metric, crit first, then by projection", () => {
    const r = report((x) => {
      x.cycle_to_date.emails_peak_day = 75; // warn
      x.cycle_to_date.egress_est_bytes = 4.5e9; // crit (projected > 100 %)
    });
    expect(alertCandidates(model(r)).map((i) => [i.metric, i.level])).toEqual([["egress", "crit"], ["email_day", "warn"]]);
  });

  it("adds 'snapshot' (warn) when it is older than 2 hours or missing", () => {
    const quiet = (x: UsageReport) => (x.cycle_to_date.emails_peak_day = 10);
    expect(alertCandidates(model(report(quiet)))).toEqual([]);
    const stale = alertCandidates(model(report((x) => { quiet(x); x.snapshot_at = "2026-10-27T22:00:00Z"; })));
    expect(stale).toEqual([{ metric: "snapshot", level: "warn", m: null, hours: 4 }]);
  });

  it("the 1 MB database check (U3) produces a crit db item", () => {
    const r = report((x) => (x.settings.limits.free.db_bytes = 1_000_000));
    expect(alertCandidates(model(r))[0]).toMatchObject({ metric: "db", level: "crit" });
  });
});

describe("email", () => {
  const items = alertCandidates(model(report((x) => {
    x.cycle_to_date.emails_peak_day = 75;
    x.cycle_to_date.egress_est_bytes = 4.5e9;
    x.snapshot_at = null;
  })));

  it("subject names the worst item with its used % and level", () => {
    const m = digestEmail(items, LINK);
    const used = Math.round(items[0].m!.usedPct);
    expect(m.subject).toBe(`Masjid View: Egress ${used}% (Tindakan)`);
    expect(digestEmail([items.find((i) => i.metric === "email_day")!], LINK).subject).toBe("Masjid View: Emel sehari (puncak) 75% (Perhatian)");
    expect(digestEmail([items.find((i) => i.metric === "snapshot")!], LINK).subject).toBe("Masjid View: Snapshot penggunaan terhenti (Perhatian)");
  });

  it("one line per item with used, projected and action, then the link (text and HTML)", () => {
    const m = digestEmail(items, LINK);
    for (const i of items) {
      expect(m.text).toContain(itemLine(i));
      expect(m.html).toContain(escapeHtml(itemLine(i)));
    }
    expect(itemLine(items.find((i) => i.metric === "email_day")!)).toBe(
      "Emel sehari (puncak) (Perhatian): 75 / 100 (75%), unjuran akhir kitaran 75 (75%). Galakkan AJK log masuk dengan Google (tiada emel), atau naik taraf ke Resend Pro.");
    expect(itemLine(items.find((i) => i.metric === "snapshot")!)).toContain("belum pernah berjalan");
    expect(m.text).toContain(LINK);
    expect(m.html).toContain(escapeHtml(LINK));
    expect(m.html).not.toMatch(/<script/i);
  });

  it("formats values like Supabase's usage page", () => {
    expect(fmtValue(3.74e9, "bytes")).toBe("3.74 GB");
    expect(fmtValue(41.6e6, "bytes")).toBe("41.6 MB");
    expect(fmtValue(286e6, "bytes")).toBe("286 MB");
    expect(fmtValue(0.9667, "rps")).toBe("0.97 permintaan/s");
    expect(fmtValue(3000, "count")).toBe("3,000");
  });
});

describe("x-cron-secret", () => {
  it("matches only the exact secret", () => {
    expect(sameSecret("abc123", "abc123")).toBe(true);
    expect(sameSecret("abc124", "abc123")).toBe(false);
    expect(sameSecret("abc12", "abc123")).toBe(false);
    expect(sameSecret(null, "abc123")).toBe(false);
    expect(sameSecret("", "")).toBe(false); // an unset secret never matches
  });
});
