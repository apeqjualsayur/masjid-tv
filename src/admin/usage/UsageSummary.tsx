"use client";
// Ringkasan strip (PRD usage §7.1): verdict · active masjids · screens online · first limit reached.
import { useT } from "../i18n";
import { cycleLastDay, fmtDayMonth, fmtMonthYear } from "./format";
import type { UsageMetric, UsageModel } from "./model";
import type { UsageReport } from "./types";

export function whenText(m: UsageMetric, t: (k: string, v?: Record<string, string | number>) => string, locale: string): string | null {
  if (m.runsOutWhen === "now") return t("usage.meter.now");
  if (m.runsOutWhen === "beyond") return t("usage.meter.beyond");
  if (m.runsOutWhen === "date" && m.runsOutDate) return fmtMonthYear(m.runsOutDate, locale);
  return null;
}

export function UsageSummary({ r, u }: { r: UsageReport; u: UsageModel }) {
  const { t, locale } = useT();
  const s = r.settings;
  const c = r.cycle;
  const day = Math.max(1, Math.ceil(c.days_elapsed));
  const pct = Math.min(100, (c.days_elapsed / c.days_total) * 100);
  const plan = s.plan === "pro" ? t("usage.scale.pro") : t("usage.scale.free");
  const n = (v: number) => v.toLocaleString(locale);
  const big = "text-[28px] font-extrabold leading-[1.1] tracking-[-0.4px] tabular-nums lg:text-[30px]";
  const eyebrow = "text-[11px] font-extrabold uppercase tracking-[0.08em]";
  const firstWhen = u.first ? whenText(u.first, t, locale) : null;

  return (
    <section
      aria-label={t("usage.summary.label")}
      className="grid grid-cols-1 gap-px overflow-hidden rounded-[18px] bg-adm-hair shadow-[0_1px_3px_rgba(18,38,30,0.08)] min-[521px]:grid-cols-2 min-[901px]:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))]"
    >
      <div className="flex flex-col gap-1 bg-adm-green p-4 text-white lg:p-5">
        <span className={`${eyebrow} text-[#CFE6DA]`}>{t("usage.summary.plan", { plan, status: t(`usage.summary.status.${u.worst.level}`) })}</span>
        <p className={big}>
          {t("usage.summary.rm", { rm: u.nowRm.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) })}{" "}
          <small className="text-[13px] font-medium text-[#CFE6DA]">{t("usage.summary.perMonth")}</small>
        </p>
        <p className="text-[13px] text-[#CFE6DA]">{u.needPro ? t("usage.summary.recommendPro", { rm: Math.round(u.proRm).toLocaleString(locale) }) : t("usage.summary.keepPlan")}</p>
        <p className="text-[13px] text-[#CFE6DA]">
          {t("usage.summary.cycle", { start: fmtDayMonth(c.start, locale), end: fmtDayMonth(cycleLastDay(c.end), locale), day, total: c.days_total })}
        </p>
        <div role="img" aria-label={t("usage.summary.cycleBar", { day, total: c.days_total })} className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/20">
          <span className="block h-full bg-adm-gold" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="flex flex-col gap-1 bg-adm-card p-4 lg:p-5">
        <span className={`${eyebrow} text-adm-muted`}>{t("usage.summary.active")}</span>
        <p className={big}>
          {n(r.live.orgs_seen_24h)} <small className="text-[13px] font-medium text-adm-muted">{t("usage.summary.approved", { n: n(r.live.orgs.active) })}</small>
        </p>
        <p className="text-[13px] text-adm-muted">{t("usage.summary.activeLine", { pending: n(r.live.orgs.pending) })}</p>
      </div>

      <div className="flex flex-col gap-1 bg-adm-card p-4 lg:p-5">
        <span className={`${eyebrow} text-adm-muted`}>{t("usage.summary.screens")}</span>
        <p className={big}>
          {n(r.live.screens_online)} <small className="text-[13px] font-medium text-adm-muted">{t("usage.summary.screensOf", { n: n(r.live.screens_total) })}</small>
        </p>
        <p className="text-[13px] text-adm-muted">{t("usage.summary.screensOff", { n: n(Math.max(0, r.live.screens_total - r.live.screens_online)) })}</p>
      </div>

      <div className="flex flex-col gap-1 bg-adm-card p-4 lg:p-5">
        <span className={`${eyebrow} text-adm-muted`}>{t("usage.summary.first")}</span>
        {u.first && u.first.runsOutAt != null ? (
          <>
            <p className={big}>
              {t("usage.summary.firstValue", { n: n(u.first.runsOutAt) })} <small className="text-[13px] font-medium text-adm-muted">{t("usage.summary.masjid")}</small>
            </p>
            <p className="text-[13px] text-adm-muted">
              {firstWhen ? t("usage.summary.firstLine", { name: t(`usage.metric.${u.first.key}`), when: firstWhen }) : t(`usage.metric.${u.first.key}`)}
            </p>
          </>
        ) : (
          <p className="text-[15px] font-bold text-adm-muted">{t("usage.summary.firstNone")}</p>
        )}
      </div>
    </section>
  );
}
