// Usage model (_specs/30-PRD-usage.md §2, §3, §6; acceptance §10 item 7).
import { describe, expect, it } from "vitest";
import fixture from "../../../tests/fixtures/usage-report.json";
import { CALIBRATION_DAYS, DB_BASE_BYTES, EMAIL_SYNC_MAX_HOURS, GB, addDays, costUsd, level, linSlope, model, pickCompute, toRm, weekly } from "./model";
import type { UsageDay, UsageReport } from "./types";

const base = fixture as UsageReport;
/** Deep copy of the design's sample report, with changes applied. */
function report(change: (r: UsageReport) => void = () => {}): UsageReport {
  const r = structuredClone(base);
  change(r);
  return r;
}
const metric = (r: UsageReport, key: string) => model(r).metrics.find((m) => m.key === key)!;
const codes = (r: UsageReport) => model(r).actions.map((a) => a.code);
/** n days of history ending today, from a row factory. */
function history(n: number, row: (i: number) => Partial<UsageDay>, today = base.cycle.today): UsageDay[] {
  return Array.from({ length: n }, (_, i) => ({
    ...base.history[0], day: addDays(today, i - n + 1), ...row(i),
  }));
}
/** A report with no warnings and no actions. */
const quiet = (r: UsageReport) => {
  r.settings.backup_upgrade_at = 1000;
  r.cycle_to_date.emails_peak_day = 10;
};

describe("helpers", () => {
  it("linSlope is the least-squares slope, 0 for < 2 points", () => {
    expect(linSlope([1, 2, 3, 4])).toBeCloseTo(1);
    expect(linSlope([5, 5, 5])).toBe(0);
    expect(linSlope([3, 1])).toBeCloseTo(-2);
    expect(linSlope([7])).toBe(0);
    expect(linSlope([])).toBe(0);
  });

  it("weekly averages 7-day buckets, oldest first, the last ending today", () => {
    const rows = Array.from({ length: 10 }, (_, i) => i + 1); // 1..10
    expect(weekly(rows, (x) => x)).toEqual([2, 7]); // [1,2,3] and [4..10]
    expect(weekly([], (x: number) => x)).toEqual([]);
  });

  it("addDays works in whole calendar days", () => {
    expect(addDays("2026-10-28", 7)).toBe("2026-11-04");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("levels (PRD §3) at 69 / 70 / 90 / 100 %", () => {
  const s = base.settings;
  it.each([
    [69, 0, "ok"], [69.9, 69.9, "ok"], [70, 0, "warn"], [0, 70, "warn"], [89.9, 0, "warn"],
    [90, 0, "crit"], [0, 99.9, "warn"], [0, 100, "crit"], [100, 100, "crit"],
  ] as const)("used %d %%, projected %d %% → %s", (used, proj, want) => {
    expect(level(used, proj, s)).toBe(want);
  });

  it("uses the owner's warn and crit percentages", () => {
    const t = { alert_warn_pct: 50, alert_crit_pct: 80 };
    expect(level(49, 0, t)).toBe("ok");
    expect(level(50, 0, t)).toBe("warn");
    expect(level(80, 0, t)).toBe("crit");
  });

  it("a metric at exactly 70 % of its limit is warn", () => {
    const r = report((x) => (x.cycle_to_date.emails_peak_day = 70));
    expect(metric(r, "email_day").level).toBe("warn");
    expect(metric(report((x) => (x.cycle_to_date.emails_peak_day = 69)), "email_day").level).toBe("ok");
    expect(metric(report((x) => (x.cycle_to_date.emails_peak_day = 90)), "email_day").level).toBe("crit");
  });
});

describe("projection (PRD §2)", () => {
  const c = base.cycle;
  const frac = c.days_total / c.days_elapsed;

  it("flows: used ÷ days elapsed × days in cycle", () => {
    const m = metric(base, "email_month");
    expect(m.used).toBe(612);
    expect(m.proj).toBeCloseTo(612 * frac);
    expect(m.usedPct).toBeCloseTo(612 / 3000 * 100);
    expect(m.projPct).toBeCloseTo((612 * frac) / 3000 * 100);
  });

  it("stock: now + 28-day trend × days remaining", () => {
    const r = report((x) => {
      x.history = history(40, (i) => ({ db_bytes: 100e6 + i * 1e6 }));
      x.live.db_bytes = 139e6;
    });
    const m = metric(r, "db");
    expect(m.proj).toBeCloseTo(139e6 + 1e6 * (c.days_total - c.days_elapsed), 0);
    expect(m.stock).toBe(true);
  });

  it("a shrinking stock is never projected below now", () => {
    const r = report((x) => (x.history = history(28, (i) => ({ storage_bytes: 500e6 - i * 1e6 }))));
    expect(metric(r, "storage").proj).toBe(r.live.storage_bytes);
  });

  it("server load: peak screens ÷ poll seconds, limit from the plan (Free) or compute (Pro)", () => {
    const m = metric(base, "rps");
    expect(m.used).toBeCloseTo(58 / 60);
    expect(m.limit).toBe(3);
    expect(metric(report((x) => { x.settings.plan = "pro"; x.settings.compute = "small"; }), "rps").limit).toBe(30);
  });

  it("Pro switches every Supabase limit to the Pro values", () => {
    const r = report((x) => (x.settings.plan = "pro"));
    expect(metric(r, "db").limit).toBe(8e9);
    expect(metric(r, "storage").limit).toBe(1e11);
    expect(metric(r, "egress").limit).toBe(2.5e11);
    expect(metric(r, "mau").limit).toBe(100000);
  });

  it("Resend Pro has no daily email meter and a 50,000 monthly limit", () => {
    const r = report((x) => (x.settings.resend_plan = "pro"));
    expect(model(r).metrics.some((m) => m.key === "email_day")).toBe(false);
    expect(metric(r, "email_month").limit).toBe(50000);
  });
});

describe("calibration (PRD §2)", () => {
  const raw = base.cycle_to_date.egress_est_bytes;

  it("multiplies the egress and cached estimates by the factors", () => {
    const e = metric(base, "egress");
    expect(e.used).toBeCloseTo(raw * 1.18);
    expect(e.factor).toBe(1.18);
    expect(metric(base, "cached").used).toBeCloseTo(base.cycle_to_date.cached_est_bytes * 0.94);
    expect(e.source).toBe("estimate");
  });

  it(`applies for ${CALIBRATION_DAYS} days after the measurement, not after`, () => {
    const at = (n: number) => metric(report((x) => (x.calibration!.measured_on = addDays(x.cycle.today, -n))), "egress");
    expect(at(CALIBRATION_DAYS).factor).toBe(1.18);
    expect(at(CALIBRATION_DAYS).used).toBeCloseTo(raw * 1.18);
    expect(at(CALIBRATION_DAYS + 1).factor).toBeNull();
    expect(at(CALIBRATION_DAYS + 1).used).toBe(raw);
  });

  it("no calibration or a missing factor = raw estimate", () => {
    expect(metric(report((x) => (x.calibration = null)), "egress").used).toBe(raw);
    const r = report((x) => (x.calibration!.factor_cached = null));
    expect(metric(r, "cached").factor).toBeNull();
    expect(metric(r, "egress").factor).toBe(1.18);
  });
});

describe("runs out at / around (PRD §2)", () => {
  it("runs-out-at = limit ÷ per-masjid rate (flows per active masjid in the cycle)", () => {
    const m = metric(base, "egress");
    expect(m.perMasjid).toBeCloseTo(m.proj / 41);
    expect(m.runsOutAt).toBe(Math.floor(m.limit / m.perMasjid));
  });

  it("stock rates are per approved masjid", () => {
    const m = metric(base, "storage");
    expect(m.perMasjid).toBeCloseTo(286e6 / 42);
    expect(m.runsOutAt).toBe(Math.floor(1e9 / (286e6 / 42)));
  });

  it("date = today + (runs-out-at − active now) ÷ weekly growth", () => {
    const m = model(base);
    const e = m.metrics.find((x) => x.key === "egress")!;
    expect(e.runsOutWhen).toBe("date");
    expect(e.runsOutDate).toBe(addDays(base.cycle.today, Math.round(((e.runsOutAt! - 41) / m.perWeek) * 7)));
  });

  it("'now' when already reached, 'beyond' past 104 weeks, null without growth", () => {
    expect(metric(report((x) => (x.cycle_to_date.emails_peak_day = 500)), "email_day").runsOutWhen).toBe("now");
    expect(metric(base, "mau").runsOutWhen).toBe("beyond");
    const flat = report((x) => (x.history = history(84, () => ({ orgs_seen: 41 }))));
    expect(model(flat).perWeek).toBe(0);
    expect(metric(flat, "egress").runsOutWhen).toBeNull();
    expect(metric(flat, "egress").runsOutDate).toBeNull();
  });

  it("no usage = no runs-out-at", () => {
    const m = metric(report((x) => (x.cycle_to_date.emails_sent = 0)), "email_month");
    expect(m.runsOutAt).toBeNull();
    expect(m.runsOutWhen).toBeNull();
  });

  it("'first' is the flow metric that runs out at the fewest masjids", () => {
    const m = model(base);
    const flows = m.metrics.filter((x) => !x.stock && x.runsOutAt != null);
    expect(m.first!.runsOutAt).toBe(Math.min(...flows.map((x) => x.runsOutAt!)));
    expect(m.first!.stock).toBe(false);
  });
});

describe("weekly growth", () => {
  it("12 weekly buckets from 84 days; slope ≈ the sample's +3.1 per week", () => {
    const m = model(base);
    expect(m.weekly).toHaveLength(12);
    expect(m.perWeek).toBeCloseTo(3.1, 1);
  });

  it("exact slope on a straight line of +2 masjids a week", () => {
    const r = report((x) => (x.history = history(84, (i) => ({ orgs_seen: Math.floor(i / 7) * 2 }))));
    expect(model(r).perWeek).toBeCloseTo(2);
  });
});

describe("cost (PRD §6)", () => {
  const s = base.settings;
  const none = { egress: 0, cached: 0, storage: 0, db: 0 };

  it("Free = RM0 + domain ÷ 12", () => {
    expect(costUsd(s, "free", "nano", false, none)).toBe(0);
    expect(model(base).nowRm).toBeCloseTo(130 / 12);
  });

  it("Pro = US$25 + compute above the US$10 credit", () => {
    expect(costUsd(s, "pro", "micro", false, none)).toBe(25);
    expect(costUsd(s, "pro", "small", false, none)).toBe(30);
    expect(costUsd(s, "pro", "large", false, none)).toBe(125);
  });

  it("overage only above the Pro quotas", () => {
    const over = { egress: 260 * GB, cached: 270 * GB, storage: 110 * GB, db: 10 * GB };
    expect(costUsd(s, "pro", "micro", false, over)).toBeCloseTo(25 + 10 * 0.09 + 20 * 0.03 + 10 * 0.021 + 2 * 0.125);
    expect(costUsd(s, "pro", "micro", false, { egress: 250 * GB, cached: 250 * GB, storage: 100 * GB, db: 8 * GB })).toBe(25);
  });

  it("Resend Pro adds US$20; RM = US$ × fx + domain ÷ 12", () => {
    expect(costUsd(s, "free", "nano", true, none)).toBe(20);
    expect(toRm(s, 25)).toBeCloseTo(25 * 4.2 + 130 / 12);
  });

  it("switching the plan to Pro makes the current cost ≥ US$25 × fx + domain", () => {
    const m = model(report((x) => { x.settings.plan = "pro"; x.settings.compute = "micro"; }));
    expect(m.nowUsd).toBe(25);
    expect(m.nowRm).toBeGreaterThanOrEqual(25 * 4.2 + 130 / 12);
  });
});

describe("recommended plan and compute (PRD §3)", () => {
  it("smallest paid compute with guide req/s ≥ 1.5 × peak", () => {
    const s = base.settings;
    expect(pickCompute(s, 1)).toBe("micro");
    expect(pickCompute(s, 6.66)).toBe("micro"); // 1.5 × 6.66 ≤ 10
    expect(pickCompute(s, 6.67)).toBe("small");
    expect(pickCompute(s, 100)).toBe("large");
    expect(pickCompute(s, 500)).toBe("large");
    expect(model(base).recommendedCompute).toBe("micro");
  });

  it("Pro when approved masjids ≥ the backup threshold", () => {
    expect(model(base).needPro).toBe(true); // 42 ≥ 25
    expect(model(report((x) => (x.settings.backup_upgrade_at = 43))).needPro).toBe(false);
  });

  it("Pro when any Supabase metric is projected ≥ 100 %", () => {
    const r = report((x) => {
      x.settings.backup_upgrade_at = 1000;
      x.cycle_to_date.egress_est_bytes = 5e9;
    });
    expect(model(r).needPro).toBe(true);
  });

  it("emails over the limit do not make Supabase Pro necessary", () => {
    const r = report((x) => {
      x.settings.backup_upgrade_at = 1000;
      x.cycle_to_date.emails_sent = 5000;
    });
    expect(model(r).needPro).toBe(false);
  });

  it("never while already on Pro; Pro price uses the recommended compute", () => {
    expect(model(report((x) => (x.settings.plan = "pro"))).needPro).toBe(false);
    expect(model(base).proRm).toBeCloseTo(25 * 4.2 + 130 / 12);
  });
});

describe("scale table (PRD §6)", () => {
  it("current active count first, then only the larger steps", () => {
    expect(model(base).scale.map((z) => z.n)).toEqual([41, 50, 100, 250, 500, 1000]);
    expect(model(report((x) => (x.cycle_to_date.orgs_seen = 120))).scale.map((z) => z.n)).toEqual([120, 250, 500, 1000]);
    expect(model(base).scale.map((z) => z.now)).toEqual([true, false, false, false, false, false]);
  });

  it("flows scale by N ÷ active; storage and DB per approved masjid × N", () => {
    const [now, , hundred] = model(base).scale;
    expect(hundred.egressBytes).toBeCloseTo(now.egressBytes * (100 / 41));
    expect(hundred.tvs).toBe(Math.round(61 * (100 / 41)));
    expect(hundred.storageBytes).toBeCloseTo((286e6 / 42) * 100);
    expect(hundred.dbBytes).toBeCloseTo(DB_BASE_BYTES + ((41.6e6 - DB_BASE_BYTES) / 42) * 100);
  });

  it("applies the plan rules per row", () => {
    const small = report((x) => {
      x.live.orgs.active = 5;
      x.cycle_to_date.orgs_seen = 5;
      x.cycle_to_date.peak_screens_day = 7;
      x.cycle_to_date.emails_peak_day = 10;
    });
    const rows = model(small).scale;
    expect(rows[0]).toMatchObject({ n: 5, plan: "free", compute: "nano", resendPlan: "free" });
    expect(rows[0].usd).toBe(0);
    expect(rows.find((z) => z.n === 50)).toMatchObject({ plan: "pro", compute: "micro" }); // ≥ 25: backups
    const big = model(base).scale.at(-1)!;
    expect(big.plan).toBe("pro");
    expect(big.compute).toBe(pickCompute(base.settings, big.rps));
    expect(big.resendPlan).toBe("pro");
    expect(big.rm).toBeCloseTo(toRm(base.settings, big.usd));
  });
});

describe("actions (PRD §7)", () => {
  it("none when everything is fine", () => {
    expect(model(report(quiet)).actions).toEqual([{ code: "none", level: "ok" }]);
  });

  it("one fix per non-ok metric, highest projection first, with its numbers", () => {
    const r = report((x) => {
      quiet(x);
      x.cycle_to_date.emails_peak_day = 75;
      x.cycle_to_date.egress_est_bytes = 4.5e9;
    });
    const a = model(r).actions;
    expect(a.map((x) => x.code)).toEqual(["fix:egress", "fix:email_day"]);
    expect(a[0].level).toBe("crit");
    expect(a[1]).toMatchObject({ level: "warn", usedPct: 75, projPct: 75 });
  });

  it("backup: Free and approved ≥ threshold", () => {
    const a = model(report((x) => (x.cycle_to_date.emails_peak_day = 10))).actions;
    expect(a).toEqual([{ code: "backup", level: "warn", orgs: 42 }]);
    expect(codes(report((x) => { quiet(x); x.settings.plan = "pro"; x.settings.backup_upgrade_at = 1; }))).toEqual(["none"]);
  });

  it("calibrate: never, or more than 30 days ago", () => {
    expect(model(report((x) => { quiet(x); x.calibration = null; })).actions).toEqual([{ code: "calibrate", level: "info", days: null }]);
    expect(model(report((x) => { quiet(x); x.calibration!.measured_on = addDays(x.cycle.today, -31); })).actions)
      .toEqual([{ code: "calibrate", level: "info", days: 31 }]);
    expect(codes(report((x) => { quiet(x); x.calibration!.measured_on = addDays(x.cycle.today, -30); }))).toEqual(["none"]);
  });

  it(`email_sync: never, or more than ${EMAIL_SYNC_MAX_HOURS} hours ago (job runs every 2 days)`, () => {
    const at = (iso: string | null) => report((x) => { quiet(x); x.cycle_to_date.emails_synced_at = iso; });
    expect(model(at(null)).actions).toEqual([{ code: "email_sync", level: "warn", hours: null }]);
    expect(model(at("2026-10-25T23:00:00Z")).actions).toEqual([{ code: "email_sync", level: "warn", hours: 51 }]); // generated 02:00Z
    expect(codes(at("2026-10-26T00:00:00Z"))).toEqual(["none"]); // exactly 50 h
    expect(codes(at("2026-10-26T04:00:00Z"))).toEqual(["none"]); // 46 h: normal between runs
  });

  it("snapshot: never, or more than 2 hours ago", () => {
    const at = (iso: string | null) => report((x) => { quiet(x); x.snapshot_at = iso; });
    expect(model(at(null)).actions).toEqual([{ code: "snapshot", level: "warn", hours: null }]);
    expect(model(at("2026-10-27T23:00:00Z")).actions).toEqual([{ code: "snapshot", level: "warn", hours: 3 }]);
    expect(codes(at("2026-10-28T00:30:00Z"))).toEqual(["none"]); // 1.5 h
  });

  it("prices: checked more than 180 days ago", () => {
    expect(model(report((x) => { quiet(x); x.settings.prices_checked_on = addDays(x.cycle.today, -181); })).actions)
      .toEqual([{ code: "prices", level: "info", days: 181 }]);
    expect(codes(report((x) => { quiet(x); x.settings.prices_checked_on = addDays(x.cycle.today, -180); }))).toEqual(["none"]);
  });

  it("ordered crit, then warn, then info", () => {
    const r = report((x) => {
      x.calibration = null; // info
      x.snapshot_at = null; // warn
      x.cycle_to_date.emails_peak_day = 95; // crit
    });
    const a = model(r).actions;
    expect(a.map((x) => x.code)).toEqual(["fix:email_day", "backup", "snapshot", "calibrate"]);
    expect(a.map((x) => x.level)).toEqual(["crit", "warn", "warn", "info"]);
  });

  it("worst = the most severe metric", () => {
    expect(model(base).worst.key).toBe("email_day");
    expect(model(report(quiet)).worst.level).toBe("ok");
  });
});

describe("empty report (0 screens, 1 day of data)", () => {
  const empty = report((x) => {
    x.cycle = { start: "2026-10-28", end: "2026-11-28", today: "2026-10-28", days_elapsed: 0.04, days_total: 31 };
    x.snapshot_at = null;
    x.calibration = null;
    x.live = { db_bytes: 0, storage_bytes: 0, storage_objects: 0, mau_30d: 0, screens_total: 0, screens_online: 0,
      orgs: { pending: 0, active: 0, suspended: 0, rejected: 0 }, orgs_seen_24h: 0 };
    x.cycle_to_date = { pings: 0, full_bundles: 0, screens_seen: 0, orgs_seen: 0, peak_screens_day: 0, bundle_bytes: 0,
      admin_est_bytes: 0, egress_est_bytes: 0, cached_est_bytes: 0, emails_sent: 0, emails_peak_day: 0, emails_today: 0, emails_synced_at: null };
    x.history = history(1, () => ({ db_bytes: 0, storage_bytes: 0, storage_objects: 0, orgs_active: 0, orgs_seen: 0, screens_total: 0,
      screens_seen: 0, pings: 0, full_bundles: 0, bundle_bytes: 0, mau_30d: 0, emails: 0 }));
  });

  it("does not throw and has no NaN or Infinity", () => {
    const m = model(empty);
    const numbers = JSON.stringify(m, (_, v) => (typeof v === "number" && !Number.isFinite(v) ? `BAD ${v}` : v));
    expect(numbers).not.toContain("BAD");
    expect(m.metrics.every((x) => x.level === "ok" && x.runsOutAt === null && x.runsOutWhen === null)).toBe(true);
    expect(m.perWeek).toBe(0);
    expect(m.first).toBeNull();
    expect(m.needPro).toBe(false);
    expect(m.scale[0]).toMatchObject({ n: 1, now: true, plan: "free" });
  });

  it("marks the data as still collecting, with the setup actions", () => {
    const m = model(empty);
    expect(m.daysOfData).toBe(1);
    expect(m.collecting).toBe(true);
    expect(model(base).collecting).toBe(false);
    expect(m.actions.map((a) => a.code)).toEqual(["email_sync", "snapshot", "calibrate"]);
  });

  it("no history at all is also safe", () => {
    const m = model(report((x) => (x.history = [])));
    expect(m.weekly).toEqual([]);
    expect(m.collecting).toBe(true);
  });
});
