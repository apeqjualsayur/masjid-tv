"use client";
// Platform › Penggunaan (_specs/30-PRD-usage.md §7, designs/admin/D-Usage.html). Platform owners only:
// platform_usage() raises not_allowed for everyone else. One RPC → model.ts → sections.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useT } from "../i18n";
import { useToasts } from "../shell/Toast";
import { CalibrationForm } from "./CalibrationForm";
import { fmtTime } from "./format";
import { GrowthChart } from "./GrowthChart";
import { model } from "./model";
import { PlanSettingsForm } from "./PlanSettingsForm";
import { ScaleTable } from "./ScaleTable";
import type { UsageReport } from "./types";
import { card, h2, hint, primaryBtn } from "./ui";
import { UsageActions } from "./UsageActions";
import { UsageMeter } from "./UsageMeter";
import { UsageSummary } from "./UsageSummary";

/** Auto-refresh while the page is visible (PRD usage §7). */
export const REFRESH_MS = 5 * 60_000;

function useUsageReport() {
  const [report, setReport] = useState<UsageReport | null>(null);
  const [error, setError] = useState<{ key: string; message?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const loadedAt = useRef(0);
  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: e } = await getSupabase().rpc("platform_usage");
    if (e) {
      const missing = e.code === "PGRST202" || (/platform_usage/.test(e.message ?? "") && /not find|does not exist/i.test(e.message ?? ""));
      setError(missing ? { key: "usage.needsMigration" } : { key: "usage.loadError", message: e.message });
    } else {
      setError(null);
      setReport(data as UsageReport);
      loadedAt.current = Date.now();
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const tick = () => {
      if (document.visibilityState === "visible" && Date.now() - loadedAt.current >= REFRESH_MS) load();
    };
    const timer = setInterval(tick, 30_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [load]);
  return { report, error, loading, reload: load };
}

export function UsageView() {
  const { t, locale } = useT();
  const { report, error, loading, reload } = useUsageReport();
  const { toast, node: toasts } = useToasts();
  const u = useMemo(() => (report ? model(report) : null), [report]);

  const header = (
    <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
      {report && <span className="text-[13px] font-semibold text-adm-muted tabular-nums">{t("usage.updated", { time: fmtTime(report.generated_at, locale) })}</span>}
      <button
        type="button"
        onClick={reload}
        disabled={loading}
        className="h-11 rounded-xl border border-adm-line bg-white px-4 text-[14px] font-bold text-adm-ink hover:bg-adm-ground focus-visible:outline-2 focus-visible:outline-adm-green disabled:opacity-60"
      >
        {t("usage.refresh")}
      </button>
    </div>
  );

  if (error && !report) {
    return (
      <div className="flex flex-col gap-4">
        <section role="alert" className={`${card} items-start`}>
          <p className="text-[15px] font-semibold text-adm-danger">{t(error.key, { message: error.message ?? "" })}</p>
          <button type="button" onClick={reload} disabled={loading} className={primaryBtn}>{t("usage.retry")}</button>
        </section>
      </div>
    );
  }

  if (!report || !u) {
    return (
      <div className="flex flex-col gap-4 lg:gap-5" aria-busy="true">
        <p className="sr-only" role="status">{t("usage.loading")}</p>
        <div className="h-[150px] animate-pulse rounded-[18px] bg-adm-hair motion-reduce:animate-none" />
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,250px),1fr))] gap-3">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="h-[190px] animate-pulse rounded-[14px] bg-adm-hair motion-reduce:animate-none" />
          ))}
        </div>
      </div>
    );
  }

  const s = report.settings;
  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      {header}
      {error && (
        <p role="alert" className="flex flex-wrap items-center gap-3 rounded-xl bg-[#FDECE8] px-3.5 py-2 text-[14px] text-adm-danger">
          <span className="flex-1">{t(error.key, { message: error.message ?? "" })}</span>
          <button type="button" onClick={reload} className="h-11 font-bold underline">{t("usage.retry")}</button>
        </p>
      )}

      <UsageSummary r={report} u={u} />

      <section aria-labelledby="usage-limits" className={card}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="usage-limits" className={h2}>{s.plan === "pro" ? t("usage.limits.titlePro") : t("usage.limits.titleFree")}</h2>
            <p className={hint}>{t("usage.limits.hint")}</p>
          </div>
          <div aria-hidden="true" className="flex flex-wrap gap-4 text-[12px] text-adm-muted">
            <span className="flex items-center gap-1.5"><i className="inline-block h-2 w-[18px] rounded-full bg-adm-ok" />{t("usage.limits.legendUsed")}</span>
            <span className="flex items-center gap-1.5">
              <i className="inline-block h-2 w-[18px] rounded-full" style={{ backgroundImage: "repeating-linear-gradient(45deg, rgba(19,122,75,.35) 0 4px, rgba(19,122,75,.12) 4px 8px)" }} />
              {t("usage.limits.legendProj")}
            </span>
            <span className="flex items-center gap-1.5"><i className="inline-block h-3 w-0.5 bg-adm-ink opacity-35" />{t("usage.limits.legendWarn", { pct: s.alert_warn_pct })}</span>
          </div>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,250px),1fr))] gap-3">
          {u.metrics.map((m) => (
            <UsageMeter key={m.key} m={m} r={report} collecting={u.collecting} daysOfData={u.daysOfData} rpsNow={u.rpsNow} />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-4 lg:gap-5 min-[1100px]:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <UsageActions u={u} r={report} />
        <GrowthChart weekly={u.weekly} perWeek={u.perWeek} />
      </div>

      <ScaleTable rows={u.scale} />

      <div className="grid grid-cols-1 items-start gap-4 lg:gap-5 min-[1100px]:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <CalibrationForm r={report} onSaved={reload} toast={toast} />
        <PlanSettingsForm key={s.updated_at ?? "settings"} r={report} onSaved={reload} toast={toast} />
      </div>
      {toasts}
    </div>
  );
}
