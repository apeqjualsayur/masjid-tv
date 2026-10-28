// Renders every Penggunaan section from the design's sample report and from an empty report.
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import fixture from "../../../tests/fixtures/usage-report.json";
import { LangProvider } from "../i18n";
import { calibrationError } from "./CalibrationForm";
import { GrowthChart } from "./GrowthChart";
import { addDays, model } from "./model";
import { planValid } from "./PlanSettingsForm";
import { ScaleTable } from "./ScaleTable";
import type { UsageReport } from "./types";
import { UsageActions } from "./UsageActions";
import { UsageMeter } from "./UsageMeter";
import { UsageSummary } from "./UsageSummary";

const base = fixture as UsageReport;
const html = (node: ReactNode) => renderToStaticMarkup(<LangProvider>{node}</LangProvider>);

function all(r: UsageReport): string {
  const u = model(r);
  return html(
    <>
      <UsageSummary r={r} u={u} />
      {u.metrics.map((m) => (
        <UsageMeter key={m.key} m={m} r={r} collecting={u.collecting} daysOfData={u.daysOfData} rpsNow={u.rpsNow} />
      ))}
      <UsageActions u={u} r={r} />
      <GrowthChart weekly={u.weekly} perWeek={u.perWeek} />
      <ScaleTable rows={u.scale} />
    </>,
  );
}

const empty = (() => {
  const r = structuredClone(base);
  r.cycle = { start: "2026-10-28", end: "2026-11-28", today: "2026-10-28", days_elapsed: 0.04, days_total: 31 };
  r.snapshot_at = null;
  r.calibration = null;
  r.live = { db_bytes: 30e6, storage_bytes: 0, storage_objects: 0, mau_30d: 1, screens_total: 0, screens_online: 0,
    orgs: { pending: 0, active: 0, suspended: 0, rejected: 0 }, orgs_seen_24h: 0 };
  r.cycle_to_date = { pings: 0, full_bundles: 0, screens_seen: 0, orgs_seen: 0, peak_screens_day: 0, bundle_bytes: 0, admin_est_bytes: 0,
    egress_est_bytes: 0, cached_est_bytes: 0, emails_sent: 0, emails_peak_day: 0, emails_today: 0, emails_synced_at: null };
  r.history = [{ ...base.history[0], day: "2026-10-28" }];
  return r;
})();

describe("Penggunaan sections", () => {
  it("render the sample report in BM with no missing translation keys", () => {
    const out = all(base);
    expect(out).not.toMatch(/usage\.[a-z_]+\.[a-z_]/); // an untranslated key would show as text
    expect(out).toContain("Pangkalan data");
    expect(out).toContain("Perhatian"); // email_day is at 74 %
    expect(out).toContain("Anggaran ×1.18 (diselaraskan)");
    expect(out).toContain("<svg");
    expect(out).toContain("Disyorkan: Pro");
  });

  it("every meter bar has an aria-label with used and projected %", () => {
    const out = all(base);
    expect(out.match(/role="img" aria-label="[^"]+: [\d.]+% digunakan, unjuran [\d.]+%"/g)?.length).toBe(model(base).metrics.length);
  });

  it("empty report (< 2 days): flows show 'Mengumpul data', the chart waits, nothing throws", () => {
    const out = all(empty);
    expect(out).toContain("Mengumpul data (hari 1 / 2)");
    expect(out).toContain("Belum cukup data");
    expect(out).not.toContain("<svg");
    expect(out).not.toMatch(/NaN|Infinity|undefined/);
  });
});

describe("form validation", () => {
  const today = "2026-10-28";
  it("calibration: date ≤ today, egress 0–100,000 GB, cached optional", () => {
    expect(calibrationError(today, today, "1.2", "")).toBeNull();
    expect(calibrationError(today, today, "0", "0.5")).toBeNull();
    expect(calibrationError(addDays(today, 1), today, "1", "")).toBe("usage.calibrate.badDate");
    expect(calibrationError("", today, "1", "")).toBe("usage.calibrate.badDate");
    expect(calibrationError(today, today, "", "")).toBe("usage.calibrate.badValue");
    expect(calibrationError(today, today, "-1", "")).toBe("usage.calibrate.badValue");
    expect(calibrationError(today, today, "100001", "")).toBe("usage.calibrate.badValue");
    expect(calibrationError(today, today, "1", "abc")).toBe("usage.calibrate.badValue");
  });

  it("plan settings: day 1–28, rate 3–6, domain ≥ 0", () => {
    const ok = { plan: "free", compute: "nano", resend: "free", cycleDay: "15", fx: "4.2", domain: "130" } as const;
    expect(planValid(ok)).toBe(true);
    expect(planValid({ ...ok, cycleDay: "29" })).toBe(false);
    expect(planValid({ ...ok, cycleDay: "1.5" })).toBe(false);
    expect(planValid({ ...ok, fx: "7" })).toBe(false);
    expect(planValid({ ...ok, domain: "" })).toBe(false);
    expect(planValid({ ...ok, domain: "-1" })).toBe(false);
  });
});
